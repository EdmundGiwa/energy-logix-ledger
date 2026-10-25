from rest_framework import serializers
from client_portal.models import (
    ClientPortalProfile,
    SharedDeliverablePackage,
    ClientPortalAccessLog,
)


class ClientPortalProfileSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = ClientPortalProfile
        fields = [
            "public_id",
            "username",
            "user_email",
            "client_name",
            "client_customer_code",
            "allowed_modules",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["public_id", "created_at", "updated_at"]


class SharedDeliverablePackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SharedDeliverablePackage
        fields = [
            "public_id",
            "client_name",
            "title",
            "deliverable_type",
            "source_reference",
            "summary_metadata",
            "verification_seal",
            "expires_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["public_id", "verification_seal", "created_at", "updated_at"]


class ClientPortalAccessLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="client_user.email", read_only=True)

    class Meta:
        model = ClientPortalAccessLog
        fields = [
            "public_id",
            "user_email",
            "client_name",
            "action",
            "resource_type",
            "resource_reference",
            "ip_address",
            "user_agent",
            "metadata",
            "accessed_at",
        ]
        read_only_fields = fields


class CreateClientProfileRequestSerializer(serializers.Serializer):
    target_user_id = serializers.IntegerField(required=True)
    client_name = serializers.CharField(max_length=150, required=True)
    client_customer_code = serializers.CharField(max_length=60, required=False, allow_blank=True, default="")
    allowed_modules = serializers.ListField(child=serializers.CharField(), required=False, default=list)


class SharePackageRequestSerializer(serializers.Serializer):
    client_name = serializers.CharField(max_length=150, required=True)
    title = serializers.CharField(max_length=200, required=True)
    deliverable_type = serializers.ChoiceField(choices=SharedDeliverablePackage.DeliverableType.choices, required=True)
    source_reference = serializers.CharField(max_length=100, required=True)
    summary_metadata = serializers.DictField(required=False, default=dict)
    expires_at = serializers.DateTimeField(required=False, allow_null=True, default=None)
