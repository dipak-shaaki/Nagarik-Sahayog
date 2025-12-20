
import os
import django

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import Department

def cleanup():
    allowed_depts = [
        "Road and Transport",
        "Waste and Sanitation",
        "Water and Drainage",
        "Other"
    ]
    
    print("Cleaning up departments...")
    
    # Get all departments
    all_depts = Department.objects.all()
    
    deleted_count = 0
    for dept in all_depts:
        if dept.name not in allowed_depts:
            print(f"Deleting old department: {dept.name}")
            dept.delete()
            deleted_count += 1
        else:
            print(f"Keeping: {dept.name}")
            
    print(f"Cleanup complete. Deleted {deleted_count} departments.")

if __name__ == '__main__':
    cleanup()
