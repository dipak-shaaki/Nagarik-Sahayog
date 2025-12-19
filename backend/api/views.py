from rest_framework import viewsets, permissions, status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .models import Department, Report, EmergencyRequest, FieldOfficialLocation
from .permissions import IsSuperAdmin, IsDeptAdmin, IsOfficial
from .serializers import (
    DepartmentSerializer, UserSerializer, 
    RegisterSerializer, ReportSerializer,
    AdminRegistrationSerializer, EmergencyRequestSerializer,
    FieldOfficialLocationSerializer
)
import math
import random

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

class CreateStaffView(generics.CreateAPIView):
    """View for SuperAdmins to create DeptAdmins and Officials"""
    queryset = User.objects.all()
    serializer_class = AdminRegistrationSerializer
    permission_classes = (IsSuperAdmin | IsDeptAdmin,)

    def perform_create(self, serializer):
        # Additional logic: DeptAdmin can only create FIELD_OFFICIALs 
        # in their own department
        request_user = self.request.user
        role = serializer.validated_data.get('role')
        
        if request_user.role == 'DEPT_ADMIN':
            if role != 'FIELD_OFFICIAL':
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Department Admins can only create Field Officials.")
            serializer.save(department=request_user.department)
        else:
            serializer.save()

class UserMeView(APIView):
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class DepartmentListView(generics.ListAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = (permissions.AllowAny,)

class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = None
        
        if user.role == 'SUPER_ADMIN':
            queryset = Report.objects.all()
        elif user.role == 'DEPT_ADMIN':
            # See reports in their department
            queryset = Report.objects.filter(category=user.department)
        elif user.role == 'FIELD_OFFICIAL':
            # See tasks assigned to them
            queryset = Report.objects.filter(assigned_official=user)
        else:
            # Citizens see their own reports
            queryset = Report.objects.filter(citizen=user)
        
        # Sort by priority for admins and officials
        if user.role in ['SUPER_ADMIN', 'DEPT_ADMIN', 'FIELD_OFFICIAL']:
            queryset = queryset.order_by('-priority_score', '-created_at')
        
        return queryset

    def perform_create(self, serializer):
        # Save the report first
        report = serializer.save(citizen=self.request.user)
        
        # Calculate AI-based priority
        try:
            from api.ai_priority import calculate_priority_with_ai
            score, level, reasoning = calculate_priority_with_ai(report)
            
            report.priority_score = score
            report.priority_level = level
            report.ai_reasoning = reasoning
            report.save()
            
            print(f"Report #{report.id} prioritized: {score} ({level})")
        except Exception as e:
            print(f"Priority calculation failed for report #{report.id}: {e}")
            # Report is still saved, just without priority

class AssignReportView(APIView):
    permission_classes = (IsSuperAdmin | IsDeptAdmin,)

    def post(self, request, pk):
        try:
            report = Report.objects.get(pk=pk)
            official_id = request.data.get('official_id')
            
            # DeptAdmin can only assign to officials in THEIR department
            if request.user.role == 'DEPT_ADMIN':
                official = User.objects.get(pk=official_id, role='FIELD_OFFICIAL', department=request.user.department)
                # Also check if report is in their department
                if report.category != request.user.department:
                    return Response({'error': 'Report belongs to a different department'}, status=status.HTTP_403_FORBIDDEN)
            else:
                official = User.objects.get(pk=official_id, role='FIELD_OFFICIAL')
            
            report.assigned_official = official
            report.status = 'ASSIGNED'
            report.save()
            
            return Response({'status': 'assigned'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'Official not found or not in your department'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class StaffListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = (IsSuperAdmin | IsDeptAdmin,)

    def get_queryset(self):
        user = self.request.user
        if user.role == 'SUPER_ADMIN':
            return User.objects.filter(role__in=['DEPT_ADMIN', 'FIELD_OFFICIAL'])
        return User.objects.filter(role='FIELD_OFFICIAL', department=user.department)

class UpdateReportStatusView(APIView):
    permission_classes = (IsOfficial | IsDeptAdmin | IsSuperAdmin,)

    def patch(self, request, pk):
        try:
            report = Report.objects.get(pk=pk)
            new_status = request.data.get('status')
            
            if new_status not in ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'DECLINED']:
                return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

            # Security: Only assigned official or relevant admin
            if request.user.role == 'FIELD_OFFICIAL' and report.assigned_official != request.user:
                return Response({'error': 'Not assigned to you'}, status=status.HTTP_403_FORBIDDEN)
            
            if request.user.role == 'DEPT_ADMIN' and report.category != request.user.department:
                return Response({'error': 'Not in your department'}, status=status.HTTP_403_FORBIDDEN)

            report.status = new_status
            report.save()
            return Response({'status': report.status}, status=status.HTTP_200_OK)
        except Report.DoesNotExist:
            return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class AcceptReportView(APIView):
    permission_classes = (IsOfficial,)

    def post(self, request, pk):
        try:
            report = Report.objects.get(pk=pk, assigned_official=request.user)
            report.status = 'IN_PROGRESS'
            report.save()
            return Response({'status': 'accepted', 'new_status': 'IN_PROGRESS'}, status=status.HTTP_200_OK)
        except Report.DoesNotExist:
            return Response({'error': 'Report not found or not assigned to you'}, status=status.HTTP_404_NOT_FOUND)

class DeclineReportView(APIView):
    permission_classes = (IsOfficial,)

    def post(self, request, pk):
        try:
            report = Report.objects.get(pk=pk, assigned_official=request.user)
            reason = request.data.get('reason')
            if not reason:
                return Response({'error': 'Rejection reason is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            report.status = 'DECLINED'
            report.rejection_reason = reason
            report.save()
            return Response({'status': 'declined', 'new_status': 'DECLINED'}, status=status.HTTP_200_OK)
        except Report.DoesNotExist:
            return Response({'error': 'Report not found or not assigned to you'}, status=status.HTTP_404_NOT_FOUND)

class EmergencyRequestViewSet(viewsets.ModelViewSet):
    serializer_class = EmergencyRequestSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        if user.role == 'CITIZEN':
            return EmergencyRequest.objects.filter(citizen=user)
        elif user.role == 'FIELD_OFFICIAL':
            return EmergencyRequest.objects.filter(assigned_official=user)
        return EmergencyRequest.objects.all()

    def perform_create(self, serializer):
        # 1. Save the request
        emergency = serializer.save(citizen=self.request.user)
        print(f"DEBUG: Emergency created: {emergency.id}, Service: {emergency.service_type}")
        
        # 2. Find nearest available official
        service_type = emergency.service_type
        # Map service_type to department name (simplified)
        dept_name_map = {
            'AMBULANCE': 'Health',
            'FIRE': 'Fire',
            'POLICE': 'Police'
        }
        target_dept_name = dept_name_map.get(service_type)
        print(f"DEBUG: Target Dept: {target_dept_name}")
        
        # Find officials in that department who are available
        officials = User.objects.filter(
            role='FIELD_OFFICIAL',
            department__name__icontains=target_dept_name or service_type
        )
        print(f"DEBUG: Found {officials.count()} officials in department")

        # Fallback: If no officials found in specific department, try finding ANY field official (for demo purposes)
        if officials.count() == 0:
            print("DEBUG: No officials in dept, trying wildcard search")
            officials = User.objects.filter(role='FIELD_OFFICIAL')

        nearest_official = None
        min_dist = float('inf')

        for official in officials:
            # Ensure location exists
            loc, _ = FieldOfficialLocation.objects.get_or_create(
                official=official,
                defaults={'latitude': 27.7172, 'longitude': 85.3240}
            )
            
            # For demo: Ignore availability check if we are desperate? 
            # Better: just log it.
            if not loc.is_available:
                print(f"DEBUG: Official {official.id} is busy")
                # For demo purposes, let's steal them if we have no one else? 
                # No, stick to logic, but maybe we need to reset them manually.
                continue

            try:
                dist = self.calculate_distance(
                    emergency.latitude, emergency.longitude,
                    loc.latitude, loc.longitude
                )
                print(f"DEBUG: Official {official.id} dist: {dist}")
                if dist < min_dist:
                    min_dist = dist
                    nearest_official = official
            except Exception as e:
                print(f"DEBUG: Calc distance error: {e}")

        if nearest_official:
            print(f"DEBUG: Assigning official {nearest_official.id}")
            emergency.assigned_official = nearest_official
            emergency.status = 'DISPATCHED'
            # Mark official as unavailable
            loc = nearest_official.current_location
            loc.is_available = False
            loc.save()
            emergency.save()
        else:
            print("DEBUG: No nearest official found to assign.")

    def calculate_distance(self, lat1, lon1, lat2, lon2):
        R = 6371 # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2) * math.sin(dlat / 2) + \
            math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
            math.sin(dlon / 2) * math.sin(dlon / 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

class UpdateLocationView(APIView):
    permission_classes = (IsOfficial,)

    def post(self, request):
        lat = request.data.get('latitude')
        lon = request.data.get('longitude')
        
        loc, created = FieldOfficialLocation.objects.get_or_create(official=request.user)
        loc.latitude = lat
        loc.longitude = lon
        loc.save()
        
        return Response({'status': 'location updated'})

class SimulateMovementView(APIView):
    """Simulates the official moving towards the emergency location"""
    def post(self, request, pk):
        try:
            emergency = EmergencyRequest.objects.get(pk=pk)
            if not emergency.assigned_official:
                return Response({'error': 'No official assigned'}, status=400)
            
            official_loc, _ = FieldOfficialLocation.objects.get_or_create(official=emergency.assigned_official)
            
            # Teleport for demo visibility if too far (squared distance check)
            dist_sq = (emergency.latitude - official_loc.latitude)**2 + (emergency.longitude - official_loc.longitude)**2
            
            # Initialize or reset route if invalid or finished
            if not emergency.route_path or emergency.current_route_step >= len(emergency.route_path) - 1:
                # Generate a simple 20-step linear path from Official -> Citizen
                # This guarantees movement without relying on external APIs
                emergency.route_path = []
                steps = 20
                for i in range(steps + 1):
                    t = i / steps
                    lat = official_loc.latitude + (emergency.latitude - official_loc.latitude) * t
                    lon = official_loc.longitude + (emergency.longitude - official_loc.longitude) * t
                    emergency.route_path.append([lat, lon])
                emergency.current_route_step = 0
                emergency.save()
                print("DEBUG: Generated new linear simulation path")

            # Move along the route
            if emergency.route_path and len(emergency.route_path) > 0:
                # Advance 1 step per call
                emergency.current_route_step = min(
                    emergency.current_route_step + 1,
                    len(emergency.route_path) - 1
                )
                
                # Update official location
                current_point = emergency.route_path[emergency.current_route_step]
                official_loc.latitude = current_point[0]
                official_loc.longitude = current_point[1]
                
                print(f"DEBUG: Simulation Step {emergency.current_route_step}/{len(emergency.route_path)}")
                emergency.save()
            
            # Check for arrival
            dist = math.sqrt((emergency.latitude - official_loc.latitude)**2 + (emergency.longitude - official_loc.longitude)**2)
            if dist < 0.00015: # Approx 15-20 meters
                emergency.status = 'ARRIVED'
                emergency.save()
                # Free up the official for new requests
                official_loc.is_available = True
                print(f"DEBUG: Official {emergency.assigned_official.id} marked as available (arrived)")
            elif emergency.status == 'DISPATCHED':
                emergency.status = 'EN_ROUTE'
                emergency.save()
                
            # Calculate bearing before saving
            bearing = self.calculate_bearing(
                official_loc.latitude, official_loc.longitude,
                emergency.latitude, emergency.longitude
            )

            official_loc.save()
            
            return Response({
                'latitude': official_loc.latitude,
                'longitude': official_loc.longitude,
                'status': emergency.status,
                'bearing': bearing,
                'route_path': emergency.route_path  # Send full route to frontend
            })
        except EmergencyRequest.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

    def calculate_bearing(self, lat1, lon1, lat2, lon2):
        dLon = math.radians(lon2 - lon1)
        lat1 = math.radians(lat1)
        lat2 = math.radians(lat2)
        
        y = math.sin(dLon) * math.cos(lat2)
        x = math.cos(lat1) * math.sin(lat2) - \
            math.sin(lat1) * math.cos(lat2) * math.cos(dLon)
            
        bearing = math.degrees(math.atan2(y, x))
        return (bearing + 360) % 360
