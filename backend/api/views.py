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
        if user.role == 'SUPER_ADMIN':
            return Report.objects.all()
        elif user.role == 'DEPT_ADMIN':
            # See reports in their department
            return Report.objects.filter(category=user.department)
        elif user.role == 'FIELD_OFFICIAL':
            # See tasks assigned to them
            return Report.objects.filter(assigned_official=user)
        else:
            # Citizens see their own reports
            return Report.objects.filter(citizen=user)

    def perform_create(self, serializer):
        serializer.save(citizen=self.request.user)

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
        
        # 2. Find nearest available official
        service_type = emergency.service_type
        # Map service_type to department name (simplified)
        dept_name_map = {
            'AMBULANCE': 'Health',
            'FIRE': 'Fire Department',
            'POLICE': 'Police'
        }
        target_dept_name = dept_name_map.get(service_type)
        
        # Find officials in that department who are available
        officials = User.objects.filter(
            role='FIELD_OFFICIAL',
            department__name__icontains=target_dept_name or service_type
        )

        nearest_official = None
        min_dist = float('inf')

        for official in officials:
            # Ensure location exists
            loc, _ = FieldOfficialLocation.objects.get_or_create(
                official=official,
                defaults={'latitude': 27.7172, 'longitude': 85.3240}
            )
            
            if not loc.is_available:
                continue

            dist = self.calculate_distance(
                emergency.latitude, emergency.longitude,
                loc.latitude, loc.longitude
            )
            if dist < min_dist:
                min_dist = dist
                nearest_official = official

        if nearest_official:
            emergency.assigned_official = nearest_official
            emergency.status = 'DISPATCHED'
            # Mark official as unavailable
            loc = nearest_official.current_location
            loc.is_available = False
            loc.save()
            emergency.save()

    def calculate_distance(self, lat1, lon1, lat2, lon2):
        R = 6371 # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2) * math.sin(dlat / 2) + \
            math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
            math.sin(dlon / 2) * math.sin(dlon / 2)
        c = 2 * math.atan2(math.sqrt(a), Math.sqrt(1 - a))
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
            
            # Move 10% closer to the destination
            step = 0.1
            official_loc.latitude += (emergency.latitude - official_loc.latitude) * step
            official_loc.longitude += (emergency.longitude - official_loc.longitude) * step
            
            # If very close, mark as arrived
            dist = math.sqrt((emergency.latitude - official_loc.latitude)**2 + (emergency.longitude - official_loc.longitude)**2)
            if dist < 0.0001:
                emergency.status = 'ARRIVED'
                emergency.save()
            elif emergency.status == 'DISPATCHED':
                emergency.status = 'EN_ROUTE'
                emergency.save()
                
            official_loc.save()
            
            return Response({
                'latitude': official_loc.latitude,
                'longitude': official_loc.longitude,
                'status': emergency.status
            })
        except EmergencyRequest.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
