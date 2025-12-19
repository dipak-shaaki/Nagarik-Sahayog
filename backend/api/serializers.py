from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Department, Report, EmergencyRequest, FieldOfficialLocation

User = get_user_model()

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    department_name = serializers.ReadOnlyField(source='department.name')
    office_latitude = serializers.ReadOnlyField(source='department.office_latitude')
    office_longitude = serializers.ReadOnlyField(source='department.office_longitude')
    
    class Meta:
        model = User
        fields = ('id', 'username', 'phone', 'role', 'department', 'department_name', 'office_latitude', 'office_longitude', 'first_name', 'address', 'id_type', 'id_number')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('phone', 'password', 'fullName', 'address', 'idType', 'idNumber', 'role', 'department')
    
    # Custom fields for frontend compatibility
    fullName = serializers.CharField(source='first_name', required=False)
    idType = serializers.CharField(source='id_type', required=False)
    idNumber = serializers.CharField(source='id_number', required=False)

    def validate_role(self, value):
        if value not in ['CITIZEN', 'FIELD_OFFICIAL']:
            raise serializers.ValidationError("Only Citizen and Field Official roles can be registered publicly.")
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        # Use phone as username
        validated_data['username'] = validated_data.get('phone')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        return user

class AdminRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('phone', 'password', 'role', 'first_name', 'department')

    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data['username'] = validated_data.get('phone')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        return user

class ReportSerializer(serializers.ModelSerializer):
    citizen_name = serializers.ReadOnlyField(source='citizen.username')
    category_name = serializers.ReadOnlyField(source='category.name')
    official_name = serializers.ReadOnlyField(source='assigned_official.username')
    office_latitude = serializers.ReadOnlyField(source='category.office_latitude')
    office_longitude = serializers.ReadOnlyField(source='category.office_longitude')

    class Meta:
        model = Report
        fields = '__all__'
        read_only_fields = ('citizen', 'status', 'assigned_official', 'priority_score', 'priority_level', 'ai_reasoning')

class FieldOfficialLocationSerializer(serializers.ModelSerializer):
    official_name = serializers.ReadOnlyField(source='official.first_name')
    phone_number = serializers.ReadOnlyField(source='official.phone')

    class Meta:
        model = FieldOfficialLocation
        fields = '__all__'

class EmergencyRequestSerializer(serializers.ModelSerializer):
    citizen_name = serializers.ReadOnlyField(source='citizen.first_name')
    assigned_official_details = UserSerializer(source='assigned_official', read_only=True)
    unit_location = serializers.SerializerMethodField()

    class Meta:
        model = EmergencyRequest
        fields = '__all__'
        read_only_fields = ('citizen', 'status', 'assigned_official')

    def get_unit_location(self, obj):
        if obj.assigned_official and hasattr(obj.assigned_official, 'current_location'):
            return FieldOfficialLocationSerializer(obj.assigned_official.current_location).data
        return None
