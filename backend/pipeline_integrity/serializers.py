from decimal import Decimal

from rest_framework import serializers

from .models import CPSurveyPoint, Hydrotest, InspectionRecord, PigRun, PipelineAsset, PipelineAuditEvent, ROWObservation


class AssetSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)

    class Meta:
        model = PipelineAsset
        fields = ("id", "reference", "name", "fluid_type", "governing_code", "is_active", "created_at", "updated_at")


class PigRunSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    reference = serializers.CharField(required=False, max_length=40)
    asset = serializers.UUIDField(source="asset.public_id", read_only=True)
    asset_id = serializers.UUIDField(write_only=True)
    allowed_actions = serializers.SerializerMethodField()

    class Meta:
        model = PigRun
        fields = (
            "id", "asset", "asset_id", "reference", "pig_type", "launcher_kp", "receiver_kp", "status",
            "launched_at", "arrived_at", "recovered_at", "transit_velocity_mps", "debris_volume_m3", "notes",
            "version", "allowed_actions", "created_at", "updated_at",
        )
        read_only_fields = ("status", "version", "launched_at", "arrived_at", "recovered_at", "allowed_actions")

    def get_allowed_actions(self, obj):
        from .services import pig_allowed_actions
        return pig_allowed_actions(obj, self.context["membership"])

    def validate(self, attrs):
        if attrs["receiver_kp"] < attrs["launcher_kp"]:
            raise serializers.ValidationError({"receiver_kp": "Must be at or after the launcher kilometre point."})
        return attrs


class HydrotestSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    reference = serializers.CharField(required=False, max_length=40)
    asset = serializers.UUIDField(source="asset.public_id", read_only=True)
    asset_id = serializers.UUIDField(write_only=True)
    allowed_actions = serializers.SerializerMethodField()

    class Meta:
        model = Hydrotest
        fields = (
            "id", "asset", "asset_id", "reference", "test_pressure_bar", "hold_duration_minutes", "pressure_drop_bar",
            "minimum_temperature_c", "maximum_temperature_c", "status", "started_at", "completed_at", "acceptance_note",
            "version", "allowed_actions", "created_at", "updated_at",
        )
        read_only_fields = ("status", "version", "started_at", "completed_at", "allowed_actions")

    def get_allowed_actions(self, obj):
        from .services import hydro_allowed_actions
        return hydro_allowed_actions(obj, self.context["membership"])

    def validate_test_pressure_bar(self, value):
        if value <= Decimal("0"):
            raise serializers.ValidationError("Test pressure must be greater than zero.")
        return value


class TransitionSerializer(serializers.Serializer):
    version = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(max_length=500, trim_whitespace=True)


class PipelineAuditSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    actor = serializers.EmailField(source="actor.email", read_only=True)

    class Meta:
        model = PipelineAuditEvent
        fields = ("id", "action", "actor", "from_status", "to_status", "reason", "metadata", "created_at")


class InspectionRecordSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    asset = serializers.UUIDField(source="asset.public_id", read_only=True)
    asset_id = serializers.UUIDField(write_only=True)
    reference = serializers.CharField(required=False, max_length=40)

    class Meta:
        model = InspectionRecord
        fields = (
            "id", "asset", "asset_id", "reference", "inspection_type", "subject_reference", "result",
            "nominal_wall_thickness_mm", "measured_wall_thickness_mm", "corrosion_rate_mm_per_year",
            "remaining_life_years", "inspected_at", "inspector_name", "evidence_reference", "notes",
            "version", "created_at", "updated_at",
        )
        read_only_fields = ("version",)


class CPSurveyPointSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    asset = serializers.UUIDField(source="asset.public_id", read_only=True)
    asset_id = serializers.UUIDField(write_only=True)
    reference = serializers.CharField(required=False, max_length=40)

    class Meta:
        model = CPSurveyPoint
        fields = ("id", "asset", "asset_id", "reference", "kp", "potential_mv", "electrode", "surveyed_at", "surveyor_name", "notes", "created_at")


class ROWObservationSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    asset = serializers.UUIDField(source="asset.public_id", read_only=True)
    asset_id = serializers.UUIDField(write_only=True)
    reference = serializers.CharField(required=False, max_length=40)

    class Meta:
        model = ROWObservation
        fields = (
            "id", "asset", "asset_id", "reference", "kp", "category", "severity", "status", "observed_at",
            "observer_name", "description", "evidence_reference", "resolved_at", "created_at", "updated_at",
        )
