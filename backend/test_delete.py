import os
import django
from django.conf import settings

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import User, Report, Department
from rest_framework.test import APIClient
from rest_framework import status

def test_citizen_deletion():
    # 1. Create a dummy department
    dept, _ = Department.objects.get_or_create(name="Test Dept")
    
    # 2. Create a dummy citizen
    citizen, _ = User.objects.get_or_create(username="test_citizen_delete", phone="0987654321")
    citizen.role = 'CITIZEN'
    citizen.set_password("password")
    citizen.save()
    
    # 3. Create a pending report for this citizen
    report = Report.objects.create(
        citizen=citizen,
        title="Test Delete",
        description="Test",
        status='PENDING',
        category=dept,
        latitude=27.7,
        longitude=85.3
    )
    
    client = APIClient()
    client.force_authenticate(user=citizen)
    
    # 4. Try to delete
    print(f"Attempting to delete report {report.id} as {citizen.username}...")
    # Matches router path /api/reports/<pk>/
    response = client.delete(f'/api/reports/{report.id}/')
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 204:
        print("SUCCESS: Report deleted.")
    else:
        try:
            print(f"FAILURE: {response.data}")
        except:
            print(f"FAILURE: No data returned")

if __name__ == "__main__":
    test_citizen_deletion()
