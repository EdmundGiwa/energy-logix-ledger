from rest_framework import serializers

from refinery_link.models import (
    BatchQualityCertificate,
    DepotTank,
    GantryMeterTicket,
    OfftakeAppointment,
    RefineryAuditEvent,
    TankGaugeDip,
    Terminal,
)
from refinery_link.services import ALLOWED_APPOINTMENT_TRANSITIONS


class TerminalSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)

    class Meta:
        model = Terminal
        fields = ("id", "code", "name", "location", "is_active", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class DepotTankSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    terminal_id = serializers.UUIDField(source="terminal.public_id", read_only=True)
    terminal_code = serializers.CharField(source="terminal.code", read_only=True)
    terminal_name = serializers.CharField(source="terminal.name", read_only=True)

    class Meta:
        model = DepotTank
        fields = (
            "id", "terminal_id", "terminal_code", "terminal_name", "tank_number",
            "product_type", "nominal_capacity_litres", "safe_fill_level_mm",
            "current_status", "created_at", "updated_at",
        )
        read_only_fields = ("id", "terminal_id", "terminal_code", "terminal_name", "created_at", "updated_at")


class OfftakeAppointmentSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    terminal_id = serializers.UUIDField(source="terminal.public_id", read_only=True)
    terminal_code = serializers.CharField(source="terminal.code", read_only=True)
    terminal_name = serializers.CharField(source="terminal.name", read_only=True)
    allowed_actions = serializers.SerializerMethodField()

    class Meta:
        model = OfftakeAppointment
        fields = (
            "id", "terminal_id", "terminal_code", "terminal_name", "reference",
            "truck_plate", "driver_name", "driver_phone", "driver_license",
            "product_type", "nominated_volume_litres", "holding_park_slot",
            "rfid_tag", "e_callup_reference", "status", "scheduled_at",
            "checked_in_at", "called_up_at", "completed_at", "version",
            "allowed_actions", "notes", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "terminal_id", "terminal_code", "terminal_name", "reference",
            "status", "checked_in_at", "called_up_at", "completed_at",
            "version", "allowed_actions", "created_at", "updated_at",
        )

    def get_allowed_actions(self, obj):
        return list(ALLOWED_APPOINTMENT_TRANSITIONS.get(obj.status, {}).keys())


class TankGaugeDipSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    tank_id = serializers.UUIDField(source="tank.public_id", read_only=True)
    tank_number = serializers.CharField(source="tank.tank_number", read_only=True)
    terminal_code = serializers.CharField(source="tank.terminal.code", read_only=True)

    class Meta:
        model = TankGaugeDip
        fields = (
            "id", "tank_id", "tank_number", "terminal_code", "reference", "dip_type",
            "observed_level_mm", "water_cut_mm", "temperature_c", "observed_density_kg_m3",
            "gross_observed_volume_litres", "net_standard_volume_litres",
            "recorded_at", "operator_name", "notes", "created_at",
        )
        read_only_fields = ("id", "tank_id", "tank_number", "terminal_code", "reference", "created_at")


class GantryMeterTicketSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    appointment_id = serializers.UUIDField(source="appointment.public_id", read_only=True)
    appointment_reference = serializers.CharField(source="appointment.reference", read_only=True)
    truck_plate = serializers.CharField(source="appointment.truck_plate", read_only=True)
    tank_id = serializers.UUIDField(source="tank.public_id", read_only=True)
    tank_number = serializers.CharField(source="tank.tank_number", read_only=True)

    class Meta:
        model = GantryMeterTicket
        fields = (
            "id", "appointment_id", "appointment_reference", "truck_plate", "tank_id",
            "tank_number", "ticket_number", "meter_id", "batch_start_reading",
            "batch_end_reading", "gross_volume_litres", "net_volume_litres",
            "temperature_c", "density_at_15c", "variance_litres", "variance_percent",
            "status", "started_at", "completed_at", "created_at",
        )
        read_only_fields = (
            "id", "appointment_id", "appointment_reference", "truck_plate", "tank_id",
            "tank_number", "ticket_number", "variance_litres", "variance_percent",
            "status", "created_at",
        )


class BatchQualityCertificateSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)

    class Meta:
        model = BatchQualityCertificate
        fields = (
            "id", "certificate_number", "product_type", "batch_number",
            "density_at_15c", "flash_point_c", "ron", "distillation_recovery_percent",
            "sulphur_ppm", "is_compliant_nmdpra", "laboratory_name", "tested_at",
            "authorized_chemist", "notes", "created_at",
        )
        read_only_fields = ("id", "certificate_number", "created_at")


class RefineryAuditEventSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    actor_name = serializers.CharField(source="actor.get_full_name", default="", read_only=True)

    class Meta:
        model = RefineryAuditEvent
        fields = (
            "id", "actor_name", "action", "target_type", "target_id",
            "from_status", "to_status", "reason", "metadata", "created_at",
        )
        read_only_fields = ("id", "actor_name", "action", "target_type", "target_id", "from_status", "to_status", "reason", "metadata", "created_at")
