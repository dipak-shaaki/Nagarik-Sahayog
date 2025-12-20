from rest_framework import viewsets, permissions, status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from .models import Department, Report, Notification, EmergencyRequest, FieldOfficialLocation
from .permissions import IsSuperAdmin, IsDeptAdmin, IsOfficial
from .serializers import (
    DepartmentSerializer, UserSerializer, 
    RegisterSerializer, ReportSerializer,
    AdminRegistrationSerializer, NotificationSerializer,
    EmergencyRequestSerializer, FieldOfficialLocationSerializer
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
        from django.utils import timezone
        from datetime import timedelta
        
        # Get base queryset for user's notifications
        queryset = Notification.objects.filter(recipient=self.request.user)
        
        # Filter out notifications for reports that have been resolved for more than 12 hours
        twelve_hours_ago = timezone.now() - timedelta(hours=12)
        
        # Exclude notifications where:
        # - The notification has a related report
        # - The report status is RESOLVED
        # - The report was updated (resolved) more than 12 hours ago
        queryset = queryset.exclude(
            report__isnull=False,
            report__status='RESOLVED',
            report__updated_at__lt=twelve_hours_ago
        )
        
        return queryset

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

    def retrieve(self, request, *args, **kwargs):
        # Allow viewing any report details (for community feed)
        # Use Report.objects.get() to bypass queryset filtering
        try:
            report = Report.objects.get(pk=kwargs.get('pk'))
            serializer = self.get_serializer(report)
            return Response(serializer.data)
        except Report.DoesNotExist:
            return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        
        # Super Admins and Field Officials are NOT allowed to delete reports directly
        if user.role not in ['CITIZEN', 'DEPT_ADMIN']:
            return Response({'error': f'Users with role {user.role} are not allowed to delete reports.'}, status=status.HTTP_403_FORBIDDEN)

        # Security check: Dept Admin can only delete from their department
        if user.role == 'DEPT_ADMIN':
            if not user.department or instance.category_id != user.department_id:
                return Response({'error': 'You can only delete reports from your own department.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Security check: Citizens can only delete their own PENDING, RESOLVED, or DECLINED reports
        if user.role == 'CITIZEN':
            if instance.citizen_id != user.id:
                return Response({'error': 'You can only delete your own reports.'}, status=status.HTTP_403_FORBIDDEN)
            if instance.status not in ['PENDING', 'RESOLVED', 'DECLINED']:
                return Response({'error': f'Cannot delete report with status: {instance.status}. Only Pending, Resolved, or Declined reports can be deleted.'}, status=status.HTTP_400_BAD_REQUEST)
            
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_update(self, serializer):
        instance = self.get_object()
        user = self.request.user
        
        # Super Admins and Field Officials are NOT allowed to edit reports directly
        if user.role not in ['CITIZEN', 'DEPT_ADMIN']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(f"Users with role {user.role} are not allowed to edit reports.")
            
        if user.role == 'CITIZEN':
            if instance.citizen_id != user.id:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only edit your own reports.")
            if instance.status != 'PENDING':
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only edit pending reports.")
                
        # Dept Admin check is implicitly handled by get_queryset but we can be explicit
        if user.role == 'DEPT_ADMIN':
            if not user.department or instance.category_id != user.department_id:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only edit reports within your department.")
            
        serializer.save()

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        # Use Report.objects.get() instead of self.get_object() to bypass queryset filtering
        # This allows users to like any report, not just ones in their filtered queryset
        try:
            report = Report.objects.get(pk=pk)
        except Report.DoesNotExist:
            return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)
            
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
        if self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        report = serializer.save(citizen=self.request.user)
        
        # Notify the citizen that report is received
        Notification.objects.create(
            recipient=self.request.user,
            title="Report Received",
            message=f"Your report '{report.title}' has been received and is pending review.",
            report=report
        )

class AssignReportView(APIView):
    permission_classes = (IsDeptAdmin,)

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
    permission_classes = (IsOfficial | IsDeptAdmin,)

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
            
            # Store the official's name before clearing
            official_name = f"{request.user.first_name} {request.user.last_name}" if request.user.first_name else request.user.phone
            
            # Reset report to PENDING status so it can be reassigned
            report.status = 'PENDING'
            report.rejection_reason = reason
            # Clear the assignment so dept admin can assign to someone else
            report.assigned_official = None
            report.save()

            # Notify citizen about the rejection
            Notification.objects.create(
                recipient=report.citizen,
                title="Report Rejected by Field Official",
                message=f"Your report '{report.title}' was rejected by the assigned official. Reason: {reason}. It will be reassigned to another official.",
                report=report
            )

            # Notify Department Admin with rejection reason
            dept_admins = User.objects.filter(
                role='DEPT_ADMIN',
                department=report.category
            )
            
            for admin in dept_admins:
                Notification.objects.create(
                    recipient=admin,
                    title="Field Official Rejected Assignment",
                    message=f"Field Official {official_name} rejected the report '{report.title}'. Reason: {reason}. Please reassign to another official.",
                    report=report
                )

            return Response({
                'status': 'rejected', 
                'new_status': 'PENDING',
                'message': 'Report has been returned to pending status for reassignment'
            }, status=status.HTTP_200_OK)
        except Report.DoesNotExist:
            return Response({'error': 'Report not found or not assigned to you'}, status=status.HTTP_404_NOT_FOUND)

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
        
        # Two-pass approach: 1. Available only, 2. Anyone (fallback)
        candidate_officials = []
        
        # Pass 1: Gather all candidates with their distances and availability
        for official in officials:
            # Ensure location exists
            loc, _ = FieldOfficialLocation.objects.get_or_create(
                official=official,
                defaults={'latitude': 27.7172, 'longitude': 85.3240}
            )
            
            try:
                dist = self.calculate_distance(
                    emergency.latitude, emergency.longitude,
                    loc.latitude, loc.longitude
                )
                candidate_officials.append({
                    'official': official,
                    'is_available': loc.is_available,
                    'dist': dist
                })
            except Exception as e:
                print(f"DEBUG: Calc distance error: {e}")

        # Sort by distance
        candidate_officials.sort(key=lambda x: x['dist'])
        
        # Try to find nearest AVAILABLE official
        for cand in candidate_officials:
            if cand['is_available']:
                nearest_official = cand['official']
                min_dist = cand['dist']
                print(f"DEBUG: Found available official {nearest_official.id} at {min_dist}km")
                break
        
        # If no one available, steal the nearest BUSY official (Force Assignment for Demo)
        if not nearest_official and candidate_officials:
            nearest_official = candidate_officials[0]['official']
            print(f"DEBUG: All busy. Force assigning official {nearest_official.id}")

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
                    # Request driving route from OSRM (Using German server as it's often more reliable for demos)
                    osrm_url = f"https://routing.openstreetmap.de/routed-car/route/v1/driving/{official_loc.longitude},{official_loc.latitude};{emergency.longitude},{emergency.latitude}?overview=full&geometries=geojson&steps=true"
                    print(f"DEBUG: Fetching OSRM route: {osrm_url}")
                    
                    # Add User-Agent to prevent blocking
                    headers = {'User-Agent': 'NagarikSahayog/1.0'}
                    response = requests.get(osrm_url, headers=headers, timeout=5)
                    
                    if response.status_code == 200:
                        data = response.json()
                        if 'routes' in data and len(data['routes']) > 0:
                            # Extract coordinates from GeoJSON
                            route_coords = data['routes'][0]['geometry']['coordinates']
                            
                            # Validate route length
                            if len(route_coords) < 2:
                                raise Exception("OSRM returned route with insufficient points")

                            # Convert [lon, lat] to [lat, lon]
                            emergency.route_path = [[coord[1], coord[0]] for coord in route_coords]
                            emergency.current_route_step = 0
                            emergency.save()
                            print(f"DEBUG: OSRM Route found: {len(emergency.route_path)} points via roads")
                        else:
                            raise Exception("No OSRM route found in response")
                    else:
                        print(f"DEBUG: OSRM Error Response: {response.text}")
                        raise Exception(f"OSRM status {response.status_code}")
                except Exception as e:
                    print(f"DEBUG: OSRM failed ({e}), using ZigZag fallback")
                    # Randomized ZigZag Fallback (More natural than L-shape)
                    start_lat, start_lon = official_loc.latitude, official_loc.longitude
                    end_lat, end_lon = emergency.latitude, emergency.longitude
                    
                    emergency.route_path = []
                    steps = 40
                    
                    for i in range(steps + 1):
                        t = i / steps
                        # Linear interpolation
                        lat = start_lat + (end_lat - start_lat) * t
                        lon = start_lon + (end_lon - start_lon) * t
                        
                        # Add noise (simulating turns) except at start/end
                        if 0 < i < steps:
                            noise_factor = 0.002 # ~200m
                            # Simple sine wave wiggle
                            offset = math.sin(t * math.pi * 4) * noise_factor
                            lat += offset
                            lon += offset
                        
                        emergency.route_path.append([lat, lon])
                    
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
