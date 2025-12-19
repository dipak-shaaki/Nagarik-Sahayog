from rest_framework import viewsets, permissions, status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from .models import Department, Report, EmergencyRequest, FieldOfficialLocation, Notification
from .permissions import IsSuperAdmin, IsDeptAdmin, IsOfficial
from .serializers import (
    DepartmentSerializer, UserSerializer, 
    RegisterSerializer, ReportSerializer,
    AdminRegistrationSerializer, EmergencyRequestSerializer,
    FieldOfficialLocationSerializer, NotificationSerializer
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

from rest_framework.parsers import MultiPartParser, FormParser

class UserMeView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        print(f"PATCH /auth/me/ from {request.user}")
        print(f"FILES: {request.FILES}")
        print(f"DATA: {request.data}")
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            print(f"Updated user: {serializer.data.get('profile_photo')}")
            return Response(serializer.data)
        print(f"Errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DepartmentListView(generics.ListAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = (permissions.AllowAny,)

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = (permissions.IsAuthenticated,)
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'status': 'all notifications marked as read'})

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance.is_read:
            instance.is_read = True
            instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

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

    def destroy(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        print(f"Delete request for Report {pk} from user {request.user} ({request.user.role})")
        
        try:
            # 1. Find the report
            report = Report.objects.get(pk=pk)
            
            # 2. Permission Check
            if request.user.role in ['SUPER_ADMIN', 'DEPT_ADMIN']:
                # Admins can delete anything
                pass
            elif request.user.role == 'CITIZEN':
                # Citizens can only delete their own reports
                if report.citizen_id != request.user.id:
                    return Response({'error': 'You can only delete your own reports.'}, status=status.HTTP_403_FORBIDDEN)
                # Citizens can only delete in certain statuses
                if report.status not in ['PENDING', 'RESOLVED', 'DECLINED']:
                    return Response({'error': 'You can only delete reports that are pending, resolved, or declined.'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Officials or others cannot delete
                return Response({'error': 'You do not have permission to delete reports.'}, status=status.HTTP_403_FORBIDDEN)
                
            # 3. Perform Deletion
            report.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except Report.DoesNotExist:
            return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"Delete failed: {e}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        report = self.get_object()
        user = request.user
        if report.likes.filter(id=user.id).exists():
            report.likes.remove(user)
            liked = False
        else:
            report.likes.add(user)
            liked = True
        return Response({
            'liked': liked,
            'like_count': report.likes.count()
        }, status=status.HTTP_200_OK)


    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action == 'destroy':
            # Allow authenticated users (Citizens will be filtered in destroy method)
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['update', 'partial_update']:
            # For general updates, restrict too (though specific endpoints handle status)
            permission_classes = [IsSuperAdmin | IsDeptAdmin | IsOfficial]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

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

        # Notify the citizen that report is received
        Notification.objects.create(
            recipient=self.request.user,
            title="Report Received",
            message=f"Your report '{report.title}' has been received and is pending review.",
            report=report
        )

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
            
            # Notify the official
            Notification.objects.create(
                recipient=official,
                title="New Task Assigned",
                message=f"You have been assigned a new report: {report.title}",
                report=report
            )

            # Notify the citizen (Team Dispatched)
            Notification.objects.create(
                recipient=report.citizen,
                title="Team Dispatched",
                message=f"A team has been dispatched for your report: {report.title}",
                report=report
            )

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

class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = (IsSuperAdmin,)

    def get_queryset(self):
        return User.objects.all().order_by('-date_joined')

class UpdateReportStatusView(APIView):
    permission_classes = (IsOfficial | IsDeptAdmin | IsSuperAdmin,)

    def patch(self, request, pk):
        try:
            report = Report.objects.get(pk=pk)
            new_status = request.data.get('status')
            
            if new_status not in [choice[0] for choice in Report.STATUS_CHOICES]:
                return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

            # Security: Only assigned official or relevant admin
            if request.user.role == 'FIELD_OFFICIAL' and report.assigned_official != request.user:
                return Response({'error': 'Not assigned to you'}, status=status.HTTP_403_FORBIDDEN)
            
            if request.user.role == 'DEPT_ADMIN' and report.category != request.user.department:
                return Response({'error': 'Not in your department'}, status=status.HTTP_403_FORBIDDEN)

            old_status = report.status
            report.status = new_status
            report.save()

            # Notify citizen if status changed
            if old_status != new_status:
                status_titles = {
                    'ASSIGNED': 'Team Dispatched',
                    'TEAM_ARRIVED': 'Team Arrived',
                    'IN_PROGRESS': 'Work in Progress',
                    'RESOLVED': 'Work Completed',
                    'DECLINED': 'Report Declined',
                    'PENDING': 'Report Under Review'
                }
                status_msgs = {
                    'ASSIGNED': f"A team has been dispatched for your report: {report.title}",
                    'TEAM_ARRIVED': f"The team has arrived at the location for your report: {report.title}",
                    'IN_PROGRESS': f"Work is now in progress for your report: {report.title}",
                    'RESOLVED': f"Your report '{report.title}' has been successfully resolved.",
                    'DECLINED': f"Your report '{report.title}' was declined.",
                    'PENDING': f"Your report '{report.title}' is back under review."
                }

                Notification.objects.create(
                    recipient=report.citizen,
                    title=status_titles.get(new_status, "Status Updated"),
                    message=status_msgs.get(new_status, f"The status of your report '{report.title}' has been updated to {new_status}."),
                    report=report
                )
                
                # Notify admin/official if needed (optional)

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
            # Status stays as ASSIGNED when accepted, but we could add an 'is_accepted' flag if needed.
            # For now, we just update the notification.
            report.save()

            # Notify citizen (Team Dispatched)
            Notification.objects.create(
                recipient=report.citizen,
                title="Task Accepted",
                message=f"The official has accepted your report '{report.title}' and is preparing to dispatch.",
                report=report
            )

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

            # Notify citizen
            Notification.objects.create(
                recipient=report.citizen,
                title="Report Declined",
                message=f"Your report '{report.title}' was declined. Reason: {reason}",
                report=report
            )

            # Notify Department Admin (optional but good practice)
            # Find department admin... (skipping for simplicity unless user asks)

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
            
            # Teleport if too close (< 500m) AND NO ACTIVE ROUTE, or wildly far (> 30km)
            # This prevents "instant" arrival glitch on start, but allows legitimate arrival
            is_active_route = bool(emergency.route_path and len(emergency.route_path) > 0)
            dist_sq = (emergency.latitude - official_loc.latitude)**2 + (emergency.longitude - official_loc.longitude)**2
            
            if (not is_active_route and dist_sq < 0.000025) or dist_sq > 0.09: # Approx 500m check only on start
                 # Teleport to random location approx 2km away
                angle = random.uniform(0, 2 * math.pi)
                offset_dist = 0.02 # ~2km
                official_loc.latitude = emergency.latitude + offset_dist * math.sin(angle)
                official_loc.longitude = emergency.longitude + offset_dist * math.cos(angle)
                emergency.route_path = None  # Reset route
                print(f"DEBUG: Official repositioned to ~2km away for realistic approach")

            # Fetch or use cached route
            if not emergency.route_path or emergency.current_route_step >= len(emergency.route_path) - 1:
                try:
                    import requests
                    # Request driving route from OSRM
                    osrm_url = f"http://router.project-osrm.org/route/v1/driving/{official_loc.longitude},{official_loc.latitude};{emergency.longitude},{emergency.latitude}?overview=full&geometries=geojson&steps=true"
                    response = requests.get(osrm_url, timeout=2)
                    
                    if response.status_code == 200:
                        data = response.json()
                        if 'routes' in data and len(data['routes']) > 0:
                            # Extract coordinates from GeoJSON
                            route_coords = data['routes'][0]['geometry']['coordinates']
                            # Convert [lon, lat] to [lat, lon]
                            emergency.route_path = [[coord[1], coord[0]] for coord in route_coords]
                            emergency.current_route_step = 0
                            emergency.save()
                            print(f"DEBUG: OSRM Route found: {len(emergency.route_path)} points via roads")
                        else:
                            raise Exception("No OSRM route found")
                    else:
                        raise Exception(f"OSRM status {response.status_code}")
                except Exception as e:
                    print(f"DEBUG: OSRM failed ({e}), using Manhattan fallback")
                    # Manhattan Path Fallback (L-shape to look like roads)
                    mid_lat = official_loc.latitude
                    mid_lon = emergency.longitude
                    
                    # 3-point path: Start -> Corner -> End
                    # Interpolate 20 steps for each leg
                    emergency.route_path = []
                    
                    # Leg 1: Latitude change
                    for i in range(20):
                        t = i / 20
                        emergency.route_path.append([
                            official_loc.latitude + (mid_lat - official_loc.latitude) * t,
                            official_loc.longitude + (mid_lon - official_loc.longitude) * t
                        ])
                        
                    # Leg 2: Longitude change
                    for i in range(21):
                        t = i / 20
                        emergency.route_path.append([
                            mid_lat + (emergency.latitude - mid_lat) * t,
                            mid_lon + (emergency.longitude - mid_lon) * t
                        ])
                    
                    emergency.current_route_step = 0
                    emergency.save()

            # Move along the route
            if emergency.route_path and len(emergency.route_path) > 0:
                # OSRM paths can be dense. Move 2 steps at a time for speed.
                steps_per_update = 2
                emergency.current_route_step = min(
                    emergency.current_route_step + steps_per_update,
                    len(emergency.route_path) - 1
                )
                
                # Update official location
                current_point = emergency.route_path[emergency.current_route_step]
                official_loc.latitude = current_point[0]
                official_loc.longitude = current_point[1]
                
                print(f"DEBUG: Driving.. Step {emergency.current_route_step}/{len(emergency.route_path)}")
                emergency.save()
            
            # Check for arrival
            dist = math.sqrt((emergency.latitude - official_loc.latitude)**2 + (emergency.longitude - official_loc.longitude)**2)
            
            # Tightened Logic:
            # 1. Very close (< 40m): Arrived regardless of route step (approx 0.0004 deg)
            # 2. End of Route AND Close (< 150m): Handles OSRM snapping gap (approx 0.0015 deg)
            
            is_at_end_of_route = emergency.route_path and emergency.current_route_step >= len(emergency.route_path) - 1
            
            if (dist < 0.0004) or (is_at_end_of_route and dist < 0.0015):
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

class CommunityFeedView(generics.ListAPIView):
    serializer_class = ReportSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        # Return all reports EXCEPT the ones submitted by the current user AND exclude DECLINED reports
        return Report.objects.exclude(
            citizen=self.request.user
        ).exclude(
            status='DECLINED'
        ).order_by('-created_at')
