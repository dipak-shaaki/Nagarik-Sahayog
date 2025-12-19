from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    RegisterView, CreateStaffView, StaffListView, UserMeView, DepartmentListView, 
    ReportViewSet, AssignReportView, UpdateReportStatusView,
    AcceptReportView, DeclineReportView
)

router = DefaultRouter()
router.register(r'reports', ReportViewSet, basename='report')

urlpatterns = [
    # Auth
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/staff/create/', CreateStaffView.as_view(), name='staff_create'),
    path('auth/staff/', StaffListView.as_view(), name='staff_list'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', UserMeView.as_view(), name='user_me'),
    
    # Generic
    path('departments/', DepartmentListView.as_view(), name='departments'),
    
    # Custom
    path('reports/<int:pk>/assign/', AssignReportView.as_view(), name='report_assign'),
    path('reports/<int:pk>/status/', UpdateReportStatusView.as_view(), name='report_status'),
    path('reports/<int:pk>/accept/', AcceptReportView.as_view(), name='report_accept'),
    path('reports/<int:pk>/decline/', DeclineReportView.as_view(), name='report_decline'),
    
    # ViewSets
    path('', include(router.urls)),
]
