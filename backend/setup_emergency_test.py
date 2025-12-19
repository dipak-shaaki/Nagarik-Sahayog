import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import User, Department, FieldOfficialLocation
from django.contrib.auth.hashers import make_password

def setup_dummy_data():
    # 1. Create Departments if they don't exist
    depts = [
        ('Health', 'Ambulance services'),
        ('Fire Department', 'Fire brigade services'),
        ('Police', 'Police services')
    ]
    
    dept_objs = {}
    for name, desc in depts:
        dept, _ = Department.objects.get_or_create(name=name, defaults={'description': desc})
        dept_objs[name] = dept

    # 2. Create Field Officials
    officials_data = [
        ('9800000001', 'Ambulance Unit 1', 'Health', 27.7100, 85.3200),
        ('9800000002', 'Fire Unit 1', 'Fire Department', 27.7200, 85.3300),
        ('9800000003', 'Police Unit 1', 'Police', 27.7000, 85.3100),
    ]

    for phone, name, dept_name, lat, lon in officials_data:
        user, created = User.objects.get_or_create(
            phone=phone,
            defaults={
                'username': phone,
                'first_name': name,
                'role': 'FIELD_OFFICIAL',
                'department': dept_objs[dept_name],
                'password': make_password('password123')
            }
        )
        
        # Create or update location
        loc, _ = FieldOfficialLocation.objects.get_or_create(
            official=user,
            defaults={'latitude': lat, 'longitude': lon, 'is_available': True}
        )
        loc.latitude = lat
        loc.longitude = lon
        loc.is_available = True
        loc.save()
        
    print("Dummy data setup complete.")

if __name__ == '__main__':
    setup_dummy_data()
