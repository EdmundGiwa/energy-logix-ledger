from decimal import Decimal

from rest_framework import serializers

from .models import BunkerAuditEvent, BunkerDeliveryNote, Nomination, Sounding


class SoundingSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    recorded_by = serializers.EmailField(source="recorded_by.email", read_only=True)
    reviewed_by = serializers.EmailField(source="reviewed_by.email", read_only=True, allow_null=True)
    forward_sounding_m = serializers.DecimalField(max_digits=8, decimal_places=3, min_value=Decimal("0"))
    aft_sounding_m = serializers.DecimalField(max_digits=8, decimal_places=3, min_value=Decimal("0"))
    observed_volume_m3 = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))
    density_kg_m3 = serializers.DecimalField(max_digits=9, decimal_places=3, min_value=Decimal("0.001"))
    reviewed_volume_m3 = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))
    reviewed_mass_mt = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))

    class Meta:
        model = Sounding
        fields = (
            "id", "tank_reference", "forward_sounding_m", "aft_sounding_m",
            "observed_volume_m3", "observed_temperature_c", "density_kg_m3",
            "reviewed_volume_m3", "reviewed_mass_mt", "calculation_method_note",
            "status", "version", "recorded_by", "reviewed_by", "reviewed_at",
            "created_at", "updated_at",
        )
        read_only_fields = ("status", "version", "recorded_by", "reviewed_by", "reviewed_at")


class BunkerDeliveryNoteSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    approved_by = serializers.EmailField(source="approved_by.email", read_only=True, allow_null=True)
    issued_by = serializers.EmailField(source="issued_by.email", read_only=True, allow_null=True)
    delivered_quantity_mt = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))
    flashpoint_c = serializers.DecimalField(max_digits=7, decimal_places=3, min_value=Decimal("0"))
    viscosity_cst = serializers.DecimalField(max_digits=10, decimal_places=3, min_value=Decimal("0"))
    sulphur_percent = serializers.DecimalField(max_digits=7, decimal_places=4, min_value=Decimal("0"))
    water_percent = serializers.DecimalField(max_digits=7, decimal_places=4, min_value=Decimal("0"))

    class Meta:
        model = BunkerDeliveryNote
        fields = (
            "id", "number", "delivered_quantity_mt", "flashpoint_c", "viscosity_cst",
            "sulphur_percent", "water_percent", "supplier_acknowledged_by",
            "supplier_acknowledged_at", "receiver_acknowledged_by",
            "receiver_acknowledged_at", "status", "version", "approved_by",
            "approved_at", "issued_by", "issued_at", "created_at", "updated_at",
        )
        read_only_fields = ("status", "version", "approved_by", "approved_at", "issued_by", "issued_at")


class BunkerAuditEventSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    actor = serializers.EmailField(source="actor.email", read_only=True)

    class Meta:
        model = BunkerAuditEvent
        fields = ("id", "request_id", "actor", "action", "outcome", "reason", "from_status", "to_status", "metadata", "created_at")


class NominationListSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    delivered_quantity_mt = serializers.DecimalField(source="bdn.delivered_quantity_mt", max_digits=14, decimal_places=3, read_only=True, allow_null=True)
    sounding_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Nomination
        fields = (
            "id", "reference", "customer_name", "vessel_name", "imo_number", "port",
            "product_grade", "nominated_quantity_mt", "delivered_quantity_mt",
            "delivery_window_start", "delivery_window_end", "status", "version",
            "sounding_count", "created_at", "updated_at",
        )


class NominationWriteSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    reference = serializers.CharField(required=False, max_length=32)
    version = serializers.IntegerField(required=False, write_only=True)
    nominated_quantity_mt = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))

    class Meta:
        model = Nomination
        fields = (
            "id", "reference", "customer_name", "vessel_name", "imo_number", "port",
            "product_grade", "nominated_quantity_mt", "delivery_window_start",
            "delivery_window_end", "notes", "version",
        )

    def validate(self, attrs):
        start = attrs.get("delivery_window_start", getattr(self.instance, "delivery_window_start", None))
        end = attrs.get("delivery_window_end", getattr(self.instance, "delivery_window_end", None))
        if start and end and end <= start:
            raise serializers.ValidationError({"delivery_window_end": "Must be after the delivery window start."})
        return attrs


class NominationDetailSerializer(NominationListSerializer):
    notes = serializers.CharField(read_only=True)
    soundings = SoundingSerializer(many=True, read_only=True)
    bdn = BunkerDeliveryNoteSerializer(read_only=True)
    audit_events = BunkerAuditEventSerializer(many=True, read_only=True)
    allowed_actions = serializers.SerializerMethodField()

    class Meta(NominationListSerializer.Meta):
        fields = NominationListSerializer.Meta.fields + ("notes", "soundings", "bdn", "audit_events", "allowed_actions")

    def get_allowed_actions(self, obj):
        membership = self.context["membership"]
        from .services import allowed_actions
        return allowed_actions(obj, membership)


class TransitionSerializer(serializers.Serializer):
    version = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(max_length=500, trim_whitespace=True)


class SoundingReviewSerializer(TransitionSerializer):
    sounding_id = serializers.UUIDField()


class BDNCreateSerializer(serializers.ModelSerializer):
    version = serializers.IntegerField(min_value=1, write_only=True)
    delivered_quantity_mt = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))
    flashpoint_c = serializers.DecimalField(max_digits=7, decimal_places=3, min_value=Decimal("0"))
    viscosity_cst = serializers.DecimalField(max_digits=10, decimal_places=3, min_value=Decimal("0"))
    sulphur_percent = serializers.DecimalField(max_digits=7, decimal_places=4, min_value=Decimal("0"))
    water_percent = serializers.DecimalField(max_digits=7, decimal_places=4, min_value=Decimal("0"))

    class Meta:
        model = BunkerDeliveryNote
        fields = (
            "number", "delivered_quantity_mt", "flashpoint_c", "viscosity_cst",
            "sulphur_percent", "water_percent", "supplier_acknowledged_by",
            "supplier_acknowledged_at", "receiver_acknowledged_by",
            "receiver_acknowledged_at", "version",
        )

