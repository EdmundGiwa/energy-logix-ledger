from rest_framework import serializers

from .models import Membership, ModuleAccessRequest, Organization
from .modules import MODULES


class OrganizationSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    enabled_modules = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = ("id", "name", "slug", "status", "requested_plan", "enabled_modules")

    def get_enabled_modules(self, obj):
        from .services import enabled_modules

        return sorted(enabled_modules(obj))


class ModuleAccessRequestSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)

    class Meta:
        model = ModuleAccessRequest
        fields = ("id", "module", "message", "status", "created_at")
        read_only_fields = ("id", "status", "created_at")


class ModuleAccessRequestCreateSerializer(serializers.Serializer):
    module = serializers.ChoiceField(choices=list(MODULES))
    message = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")


class MembershipSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    user_id = serializers.UUIDField(source="user.public_id", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    name = serializers.SerializerMethodField()

    class Meta:
        model = Membership
        fields = ("id", "user_id", "email", "name", "role", "job_title", "is_active", "created_at")

    def get_name(self, obj):
        return obj.user.get_full_name() or obj.user.email
