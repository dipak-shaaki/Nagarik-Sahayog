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
        report = serializer.save(citizen=self.request.user)
        
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
