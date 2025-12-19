import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import FieldOfficialLocation

# Reset all field officials to available
locations = FieldOfficialLocation.objects.all()
for loc in locations:
    loc.is_available = True
    loc.save()
    print(f"Reset official {loc.official.id} ({loc.official.first_name}) to available")

print(f"\nTotal officials reset: {locations.count()}")
