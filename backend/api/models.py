from django.db import models
from django.contrib.auth.models import AbstractUser

class Department(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    office_latitude = models.FloatField(default=27.7172)
    office_longitude = models.FloatField(default=85.3240)

    def __str__(self):
        return self.name

class User(AbstractUser):
    ROLE_CHOICES = (
        ('SUPER_ADMIN', 'Super Admin'),
        ('DEPT_ADMIN', 'Department Admin'),
        ('FIELD_OFFICIAL', 'Field Official'),
        ('CITIZEN', 'Citizen'),
    )
    
    # Use phone as username
    phone = models.CharField(max_length=15, unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CITIZEN')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    address = models.CharField(max_length=255, blank=True)
    profile_photo = models.ImageField(upload_to='profiles/', null=True, blank=True)
    id_type = models.CharField(max_length=50, blank=True)
    id_number = models.CharField(max_length=50, blank=True)

    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return f"{self.phone} ({self.role})"

class Report(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('ASSIGNED', 'Assigned'),
        ('IN_PROGRESS', 'In Progress'),
        ('TEAM_ARRIVED', 'Team Arrived'),
        ('RESOLVED', 'Resolved'),
        ('DECLINED', 'Declined'),
    )
    
    citizen = models.ForeignKey(User, on_delete=models.CASCADE, related_name='submitted_reports')
    category = models.ForeignKey(Department, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField()
    latitude = models.FloatField()
    longitude = models.FloatField()
    location_address = models.CharField(max_length=255, blank=True)
    image = models.ImageField(upload_to='reports/', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    assigned_official = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    rejection_reason = models.TextField(null=True, blank=True)
    likes = models.ManyToManyField(User, related_name='liked_reports', blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.status}"

class Notification(models.Model):
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    report = models.ForeignKey(Report, on_delete=models.CASCADE, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.recipient}: {self.title}"
