import re

from rest_framework import serializers

from .models import Credential, GasTest, HseAuditEvent, Mobilization, MobilizationWorker, Permit, SafetyAcknowledgement, SafetyProcedure, Worker


class WorkerSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)

    class Meta:
        model = Worker
        fields = ("id", "employee_number", "full_name", "job_title", "email", "phone_number", "is_active", "created_at", "updated_at")
        read_only_fields = ("created_at", "updated_at")


class CredentialSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    worker_id = serializers.UUIDField(write_only=True, required=False)
    worker_name = serializers.CharField(source="worker.full_name", read_only=True)

    class Meta:
        model = Credential
        fields = ("id", "worker_id", "worker_name", "kind", "certificate_number", "issuer", "valid_from", "expires_on", "status", "evidence_reference", "verified_by", "verified_at", "created_at")
        read_only_fields = ("status", "verified_by", "verified_at", "created_at")

    def validate_evidence_reference(self, value):
        reference = value.strip()
        if not reference:
            return ""
        has_uri_scheme = re.match(r"^[a-z][a-z0-9+.-]*:", reference, flags=re.IGNORECASE)
        unsafe_path = reference.startswith(("/", "\\")) or ".." in reference.replace("\\", "/").split("/")
        has_control_character = any(ord(character) < 32 for character in reference)
        if has_uri_scheme or reference.lower().startswith("www.") or unsafe_path or has_control_character:
            raise serializers.ValidationError("Enter an opaque private-vault reference, not a URL, URI, or file path.")
        return reference


class SafetyProcedureSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)

    class Meta:
        model = SafetyProcedure
        fields = ("id", "name", "site", "credential_buffer_days", "oxygen_min_percent", "oxygen_max_percent", "max_lel_percent", "max_h2s_ppm", "required_credential_kinds", "is_approved", "approved_by", "approved_at", "created_at")
        read_only_fields = ("is_approved", "approved_by", "approved_at", "created_at")

    def validate_required_credential_kinds(self, value):
        valid = set(Credential.Kind.values)
        if not isinstance(value, list) or not value or any(item not in valid for item in value):
            raise serializers.ValidationError("Select one or more supported credential types.")
        return list(dict.fromkeys(value))


class CrewEntrySerializer(serializers.ModelSerializer):
    worker_id = serializers.UUIDField(source="worker.public_id", read_only=True)
    worker_name = serializers.CharField(source="worker.full_name", read_only=True)

    class Meta:
        model = MobilizationWorker
        fields = ("worker_id", "worker_name", "is_cleared", "blocking_reasons", "checked_at")


class MobilizationSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    procedure_id = serializers.UUIDField(write_only=True)
    procedure_name = serializers.CharField(source="procedure.name", read_only=True)
    crew_entries = CrewEntrySerializer(many=True, read_only=True)

    class Meta:
        model = Mobilization
        fields = ("id", "reference", "destination", "scheduled_at", "procedure_id", "procedure_name", "status", "version", "crew_entries", "created_at", "updated_at")
        read_only_fields = ("status", "version", "created_at", "updated_at")
        extra_kwargs = {"reference": {"required": False, "allow_blank": True}}


class GasTestSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)

    class Meta:
        model = GasTest
        fields = ("id", "tested_at", "oxygen_percent", "lel_percent", "h2s_ppm", "instrument_reference", "instrument_calibration_expires_on", "passed", "recorded_by", "created_at")
        read_only_fields = ("passed", "recorded_by", "created_at")


class AcknowledgementSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    worker_id = serializers.UUIDField(write_only=True)
    worker_name = serializers.CharField(source="worker.full_name", read_only=True)

    class Meta:
        model = SafetyAcknowledgement
        fields = ("id", "worker_id", "worker_name", "kind", "acknowledged_at", "statement", "created_at")
        read_only_fields = ("created_at",)


class AuditSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    actor = serializers.EmailField(source="actor.email", read_only=True)

    class Meta:
        model = HseAuditEvent
        fields = ("id", "actor", "action", "reason", "from_status", "to_status", "metadata", "created_at")


class PermitSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    procedure_id = serializers.UUIDField(write_only=True)
    procedure_name = serializers.CharField(source="procedure.name", read_only=True)
    performing_authority_id = serializers.UUIDField(write_only=True)
    performing_authority_name = serializers.CharField(source="performing_authority.full_name", read_only=True)
    gas_tests = GasTestSerializer(many=True, read_only=True)
    acknowledgements = AcknowledgementSerializer(many=True, read_only=True)
    audit_events = serializers.SerializerMethodField()

    class Meta:
        model = Permit
        fields = ("id", "reference", "kind", "title", "site", "work_description", "procedure_id", "procedure_name", "performing_authority_id", "performing_authority_name", "starts_at", "expires_at", "hazards", "controls", "status", "version", "approved_by", "approved_at", "gas_tests", "acknowledgements", "audit_events", "created_at", "updated_at")
        read_only_fields = ("status", "version", "approved_by", "approved_at", "created_at", "updated_at")
        extra_kwargs = {"reference": {"required": False, "allow_blank": True}}

    def get_audit_events(self, obj):
        queryset = HseAuditEvent.objects.filter(organization=obj.organization, target_type="permit", target_id=obj.public_id)
        return AuditSerializer(queryset, many=True).data


class TransitionSerializer(serializers.Serializer):
    version = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(max_length=1000)


class VersionSerializer(serializers.Serializer):
    version = serializers.IntegerField(min_value=1)
