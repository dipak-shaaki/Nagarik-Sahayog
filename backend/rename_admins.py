
import os
import django

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import User

def rename_admins():
    print("Renaming Department Admins...")
    
    # Get all department admins
    admins = User.objects.filter(role='DEPT_ADMIN')
    
    count = 0
    for admin in admins:
        if admin.department:
            new_name = f"{admin.department.name} Admin"
            if admin.first_name != new_name:
                print(f"Renaming {admin.first_name} ({admin.phone}) -> {new_name}")
                admin.first_name = new_name
                admin.save()
                count += 1
            else:
                print(f"Skipping {admin.phone}, already named correctly.")
        else:
            print(f"Skipping admin {admin.phone} (No Department assigned)")
            
    print(f"Renaming complete. Updated {count} admins.")

if __name__ == '__main__':
    rename_admins()
