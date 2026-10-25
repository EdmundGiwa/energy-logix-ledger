from rest_framework import serializers

from tank_works.models import (
    CoatingInspection,
    CrewEquipmentUtilization,
    SludgeWasteManifest,
    TankFieldJob,
    TankWorksAuditEvent,
)
from tank_works.services import ALLOWED_JOB_TRANSITIONS


class TankWorksAuditEventSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    actor_email = serializers.EmailField(source="actor.email", read_only=True)
    actor_name = serializers.CharField(source="actor.get_full_name", default="", read_only=True)

    class Meta:
        model = TankWorksAuditEvent
        fields = (
            "id", "actor_email", "actor_name", "action", "from_status",
            "to_status", "reason", "metadata", "created_at",
        )
        read_only_fields = fields


class SludgeWasteManifestSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    job_id = serializers.UUIDField(source="job.public_id", read_only=True)
    job_number = serializers.CharField(source="job.job_number", read_only=True)

    class Meta:
        model = SludgeWasteManifest
        fields = (
            "id", "job_id", "job_number", "manifest_number", "waste_classification",
            "quantity", "unit_of_measure", "transporter_name", "vehicle_registration",
            "driver_name", "nesrea_permit_number", "disposal_facility",
            "treatment_method", "is_consignment_signed", "dispatched_at",
            "disposed_at", "notes", "created_at", "updated_at",
        )
        read_only_fields = ("id", "job_id", "job_number", "created_at", "updated_at")


class CoatingInspectionSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    job_id = serializers.UUIDField(source="job.public_id", read_only=True)
    job_number = serializers.CharField(source="job.job_number", read_only=True)

    class Meta:
        model = CoatingInspection
        fields = (
            "id", "job_id", "job_number", "surface_location", "blast_standard",
            "surface_profile_microns", "coating_system", "specified_dft_microns",
            "measured_min_dft_microns", "measured_avg_dft_microns", "measured_max_dft_microns",
            "dft_passed", "adhesion_test_method", "adhesion_result_mpa",
            "ambient_temp_c", "steel_temp_c", "relative_humidity_percent", "dew_point_c",
            "inspector_name", "nace_level", "inspection_date", "passed", "notes",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "job_id", "job_number", "dft_passed", "created_at", "updated_at")


class CrewEquipmentUtilizationSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    job_id = serializers.UUIDField(source="job.public_id", read_only=True)
    job_number = serializers.CharField(source="job.job_number", read_only=True)

    class Meta:
        model = CrewEquipmentUtilization
        fields = (
            "id", "job_id", "job_number", "entry_date", "personnel_role",
            "headcount", "man_hours", "equipment_description", "equipment_hours",
            "consumables_used", "created_at",
        )
        read_only_fields = ("id", "job_id", "job_number", "created_at")


class TankFieldJobSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    allowed_actions = serializers.SerializerMethodField()
    manifests_count = serializers.IntegerField(source="waste_manifests.count", read_only=True)
    inspections_count = serializers.IntegerField(source="coating_inspections.count", read_only=True)
    audit_events = TankWorksAuditEventSerializer(many=True, read_only=True)

    class Meta:
        model = TankFieldJob
        fields = (
            "id", "job_number", "client_name", "terminal_or_facility", "tank_identifier",
            "tank_capacity_m3", "scope_of_work", "status", "safepass_permit_ref",
            "gas_test_cleared", "estimated_cost_minor", "actual_cost_minor",
            "currency", "version", "started_at", "completed_at", "notes",
            "allowed_actions", "manifests_count", "inspections_count", "audit_events",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "job_number", "status", "version", "started_at", "completed_at",
            "allowed_actions", "manifests_count", "inspections_count", "audit_events",
            "created_at", "updated_at",
        )

    def get_allowed_actions(self, obj):
        return list(ALLOWED_JOB_TRANSITIONS.get(obj.status, {}).keys())
