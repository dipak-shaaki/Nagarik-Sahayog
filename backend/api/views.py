from rest_framework import viewsets, permissions, status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from .models import Department, Report, Notification
from .permissions import IsSuperAdmin, IsDeptAdmin, IsOfficial
from .serializers import (
    DepartmentSerializer, UserSerializer, 
    RegisterSerializer, ReportSerializer,
    AdminRegistrationSerializer, NotificationSerializer
)

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
