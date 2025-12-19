import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import Department

User = get_user_model()

def run():
    # Create Departments
    depts = ['Road', 'Waste', 'Water', 'Electricity', 'Health']
    for dept_name in depts:
        Department.objects.get_or_create(name=dept_name)
    print("Departments initialized.")

    # Create Superuser
    phone = '9800000000'
    if not User.objects.filter(phone=phone).exists():
        User.objects.create_superuser(
            username='superadmin',
            phone=phone,
            password='Password123!',
            role='SUPER_ADMIN'
        )
        print(f"Superuser created with phone: {phone}")
    else:
        print("Superuser already exists.")

if __name__ == '__main__':
    run()
