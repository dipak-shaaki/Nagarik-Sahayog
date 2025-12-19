from django.contrib import admin
from .models import User, Department, Report, EmergencyRequest, FieldOfficialLocation
# Register your models here.


admin.site.register(User)
admin.site.register(Department)
admin.site.register(Report)
admin.site.register(EmergencyRequest)
admin.site.register(FieldOfficialLocation)