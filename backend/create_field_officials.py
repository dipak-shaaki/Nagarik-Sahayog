import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import Department, FieldOfficialLocation

User = get_user_model()

def create_field_officials():
    """Create field officials for different services"""
    
    # Get or create departments
    departments = {
        'Police': Department.objects.get_or_create(name='Police')[0],
        'Fire': Department.objects.get_or_create(name='Fire')[0],
        'Ambulance': Department.objects.get_or_create(name='Health')[0],
    }
    
    # Field officials data with realistic Kathmandu locations
    officials_data = [
        # Police Officers
        {
            'username': 'police_officer_1',
            'phone': '9841000001',
            'password': 'Password123!',
            'role': 'FIELD_OFFICIAL',
            'first_name': 'Ram',
            'last_name': 'Thapa',
            'department': departments['Police'],
            'location': {'latitude': 27.7172, 'longitude': 85.3240}  # Kathmandu center
        },
        {
            'username': 'police_officer_2',
            'phone': '9841000002',
            'password': 'Password123!',
            'role': 'FIELD_OFFICIAL',
            'first_name': 'Shyam',
            'last_name': 'Gurung',
            'department': departments['Police'],
            'location': {'latitude': 27.7100, 'longitude': 85.3200}  # Near Thamel
        },
        {
            'username': 'police_officer_3',
            'phone': '9841000003',
            'password': 'Password123!',
            'role': 'FIELD_OFFICIAL',
            'first_name': 'Hari',
            'last_name': 'Shrestha',
            'department': departments['Police'],
            'location': {'latitude': 27.7250, 'longitude': 85.3300}  # Near New Road
        },
        
        # Fire Officers
        {
            'username': 'fire_officer_1',
            'phone': '9841000011',
            'password': 'Password123!',
            'role': 'FIELD_OFFICIAL',
            'first_name': 'Sita',
            'last_name': 'Rai',
            'department': departments['Fire'],
            'location': {'latitude': 27.7150, 'longitude': 85.3180}
        },
        {
            'username': 'fire_officer_2',
            'phone': '9841000012',
            'password': 'Password123!',
            'role': 'FIELD_OFFICIAL',
            'first_name': 'Gita',
            'last_name': 'Tamang',
            'department': departments['Fire'],
            'location': {'latitude': 27.7200, 'longitude': 85.3280}
        },
        
        # Ambulance/Medical Officers
        {
            'username': 'ambulance_officer_1',
            'phone': '9841000021',
            'password': 'Password123!',
            'role': 'FIELD_OFFICIAL',
            'first_name': 'Krishna',
            'last_name': 'Magar',
            'department': departments['Ambulance'],
            'location': {'latitude': 27.7180, 'longitude': 85.3220}
        },
        {
            'username': 'ambulance_officer_2',
            'phone': '9841000022',
            'password': 'Password123!',
            'role': 'FIELD_OFFICIAL',
            'first_name': 'Laxmi',
            'last_name': 'Karki',
            'department': departments['Ambulance'],
            'location': {'latitude': 27.7120, 'longitude': 85.3260}
        },
        {
            'username': 'ambulance_officer_3',
            'phone': '9841000023',
            'password': 'Password123!',
            'role': 'FIELD_OFFICIAL',
            'first_name': 'Binod',
            'last_name': 'Adhikari',
            'department': departments['Ambulance'],
            'location': {'latitude': 27.7190, 'longitude': 85.3310}
        },
    ]
    
    created_count = 0
    for data in officials_data:
        # Check if user already exists
        if User.objects.filter(phone=data['phone']).exists():
            print(f"User {data['username']} already exists, skipping...")
            continue
        
        # Create user
        user = User.objects.create_user(
            username=data['username'],
            phone=data['phone'],
            password=data['password'],
            role=data['role'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            department=data['department']
        )
        
        # Create location entry
        FieldOfficialLocation.objects.create(
            official=user,
            latitude=data['location']['latitude'],
            longitude=data['location']['longitude'],
            is_available=True
        )
        
        created_count += 1
        print(f"✓ Created {data['role']}: {data['first_name']} {data['last_name']} ({data['department'].name})")
    
    print(f"\n✅ Successfully created {created_count} field officials!")
    print(f"📍 All officials are marked as available and positioned around Kathmandu")

if __name__ == '__main__':
    create_field_officials()
