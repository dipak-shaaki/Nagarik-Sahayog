
import os
import django

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import Department

def populate():
    # Desired departments
    target_depts = [
        "Road and Transport",
        "Waste and Sanitation",
        "Water and Drainage",
        "Other"
    ]
    
    print("Populating departments...")
    
    # Create or Get (to avoid duplicates if run multiple times)
    for name in target_depts:
        obj, created = Department.objects.get_or_create(name=name)
        if created:
            print(f"Created: {name}")
        else:
            print(f"Exists: {name}")

    # Optional: Clean up old ones? 
    # For safety, I will NOT delete old ones strictly, or maybe I should to ensure ONLY these 4 exist.
    # The user said "keep four categories". This implies these should be the ONLY ones.
    # However, deleting might cascade delete users/reports linked to them.
    # I will allow old ones to stay but typically in a fresh dev env, it might be fine.
    # I'll just add these for now. If the UI shows too many, we can delete manually later.
    
if __name__ == '__main__':
    populate()
