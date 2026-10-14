from decimal import Decimal

from rest_framework import serializers

from .models import (
    Customer, DeliveryLocation, Dispatch, Driver, ElectronicWaybill, Fleet,
    HaulageAuditEvent, ProofOfDelivery, Trailer, Truck, WeighbridgeReading,
)


class ReferenceSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)


class CustomerSerializer(ReferenceSerializer):
    class Meta:
        model = Customer
        fields = ("id", "name", "contact_name", "contact_phone", "is_active", "created_at")


class LocationSerializer(ReferenceSerializer):
    class Meta:
        model = DeliveryLocation
        fields = ("id", "name", "address", "contact_name", "contact_phone", "is_active", "created_at")


class TruckSerializer(ReferenceSerializer):
    capacity_litres = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))

    class Meta:
        model = Truck
        fields = ("id", "registration_number", "fleet_number", "make_model", "capacity_litres", "is_active", "created_at")


class TrailerSerializer(ReferenceSerializer):
    capacity_litres = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))

    class Meta:
        model = Trailer
        fields = ("id", "registration_number", "fleet_number", "capacity_litres", "calibration_expires_on", "is_active", "created_at")


class DriverSerializer(ReferenceSerializer):
    class Meta:
        model = Driver
        fields = ("id", "full_name", "phone_number", "licence_number", "licence_expires_on", "is_active", "created_at")


class FleetSerializer(ReferenceSerializer):
    customer = CustomerSerializer(read_only=True)
    origin = LocationSerializer(read_only=True)
    destination = LocationSerializer(read_only=True)
    truck = TruckSerializer(read_only=True)
    trailer = TrailerSerializer(read_only=True)
    driver = DriverSerializer(read_only=True)
    completed_steps = serializers.IntegerField(read_only=True)
    next_step = serializers.CharField(read_only=True)

    class Meta:
        model = Fleet
        fields = (
            "id", "reference", "status", "version", "completed_steps", "next_step",
            "customer", "origin", "destination", "truck", "trailer", "driver",
            "created_at", "updated_at",
        )


class FleetStageSerializer(serializers.Serializer):
    version = serializers.IntegerField(min_value=1)
    stage = serializers.ChoiceField(choices=("customer", "route", "truck", "trailer", "driver"))
    data = serializers.DictField()


class WeighbridgeReadingSerializer(ReferenceSerializer):
    version = serializers.IntegerField(write_only=True, min_value=1)
    recorded_by = serializers.EmailField(source="recorded_by.email", read_only=True)
    weight_kg = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))

    class Meta:
        model = WeighbridgeReading
        fields = ("id", "kind", "weight_kg", "captured_at", "weighbridge_name", "ticket_number", "source", "recorded_by", "created_at", "version")
        read_only_fields = ("source",)


class WaybillSerializer(ReferenceSerializer):
    class Meta:
        model = ElectronicWaybill
        fields = ("id", "number", "verification_code", "issued_at")


class ProofOfDeliverySerializer(ReferenceSerializer):
    version = serializers.IntegerField(write_only=True, min_value=1)
    recorded_by = serializers.EmailField(source="recorded_by.email", read_only=True)
    delivered_quantity_litres = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))
    ullage_mm = serializers.DecimalField(max_digits=10, decimal_places=3, min_value=Decimal("0"))

    class Meta:
        model = ProofOfDelivery
        fields = (
            "id", "delivered_quantity_litres", "ullage_mm", "observed_temperature_c",
            "water_paste_result", "receiver_name", "receiver_title", "receiver_acknowledged_at",
            "notes", "recorded_by", "created_at", "version",
        )


class AuditSerializer(ReferenceSerializer):
    actor = serializers.EmailField(source="actor.email", read_only=True)

    class Meta:
        model = HaulageAuditEvent
        fields = ("id", "request_id", "actor", "action", "outcome", "reason", "from_status", "to_status", "metadata", "created_at")


class DispatchListSerializer(ReferenceSerializer):
    fleet_reference = serializers.CharField(source="fleet.reference", read_only=True, allow_null=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    origin_name = serializers.CharField(source="origin.name", read_only=True)
    destination_name = serializers.CharField(source="destination.name", read_only=True)
    truck_registration = serializers.CharField(source="truck.registration_number", read_only=True)
    trailer_registration = serializers.CharField(source="trailer.registration_number", read_only=True)
    driver_name = serializers.CharField(source="driver.full_name", read_only=True)
    waybill_number = serializers.CharField(source="waybill.number", read_only=True, allow_null=True)

    class Meta:
        model = Dispatch
        fields = (
            "id", "reference", "fleet_reference", "customer_name", "origin_name", "destination_name",
            "truck_registration", "trailer_registration", "driver_name", "product",
            "planned_quantity_litres", "scheduled_departure_at", "status", "version",
            "waybill_number", "created_at", "updated_at",
        )


class DispatchWriteSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    reference = serializers.CharField(required=False, max_length=32)
    fleet_id = serializers.UUIDField(required=False, write_only=True)
    customer_id = serializers.UUIDField(required=False, write_only=True)
    origin_id = serializers.UUIDField(required=False, write_only=True)
    destination_id = serializers.UUIDField(required=False, write_only=True)
    truck_id = serializers.UUIDField(required=False, write_only=True)
    trailer_id = serializers.UUIDField(required=False, write_only=True)
    driver_id = serializers.UUIDField(required=False, write_only=True)
    version = serializers.IntegerField(required=False, write_only=True, min_value=1)
    planned_quantity_litres = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"))

    class Meta:
        model = Dispatch
        fields = (
            "id", "reference", "fleet_id", "customer_id", "origin_id", "destination_id", "truck_id",
            "trailer_id", "driver_id", "product", "planned_quantity_litres",
            "scheduled_departure_at", "notes", "version",
        )

    def validate(self, attrs):
        organization = self.context["organization"]
        fleet_id = attrs.pop("fleet_id", None)
        if fleet_id:
            try:
                fleet = Fleet.objects.select_related("customer", "origin", "destination", "truck", "trailer", "driver").get(
                    public_id=fleet_id, organization=organization, status=Fleet.Status.READY,
                )
            except Fleet.DoesNotExist:
                raise serializers.ValidationError({"fleet_id": "Select a ready fleet from your organization."})
            attrs.update(
                fleet=fleet, customer=fleet.customer, origin=fleet.origin, destination=fleet.destination,
                truck=fleet.truck, trailer=fleet.trailer, driver=fleet.driver,
            )
        mappings = {
            "customer_id": (Customer, "customer"), "origin_id": (DeliveryLocation, "origin"),
            "destination_id": (DeliveryLocation, "destination"), "truck_id": (Truck, "truck"),
            "trailer_id": (Trailer, "trailer"), "driver_id": (Driver, "driver"),
        }
        for input_name, (model, output_name) in mappings.items():
            public_id = attrs.pop(input_name, None)
            if fleet_id:
                continue
            if public_id is None and self.instance:
                continue
            if public_id is None:
                raise serializers.ValidationError({input_name: "This field is required when a fleet is not selected."})
            try:
                attrs[output_name] = model.objects.get(public_id=public_id, organization=organization, is_active=True)
            except model.DoesNotExist:
                raise serializers.ValidationError({input_name: "Select an active record from your organization."})
        origin = attrs.get("origin", getattr(self.instance, "origin", None))
        destination = attrs.get("destination", getattr(self.instance, "destination", None))
        if origin and destination and origin.pk == destination.pk:
            raise serializers.ValidationError({"destination_id": "Destination must differ from origin."})
        return attrs


class DispatchDetailSerializer(DispatchListSerializer):
    customer = CustomerSerializer(read_only=True)
    origin = LocationSerializer(read_only=True)
    destination = LocationSerializer(read_only=True)
    truck = TruckSerializer(read_only=True)
    trailer = TrailerSerializer(read_only=True)
    driver = DriverSerializer(read_only=True)
    notes = serializers.CharField(read_only=True)
    weighbridge_readings = WeighbridgeReadingSerializer(many=True, read_only=True)
    waybill = WaybillSerializer(read_only=True)
    proof_of_delivery = ProofOfDeliverySerializer(read_only=True)
    audit_events = AuditSerializer(many=True, read_only=True)
    allowed_actions = serializers.SerializerMethodField()

    class Meta(DispatchListSerializer.Meta):
        fields = DispatchListSerializer.Meta.fields + (
            "customer", "origin", "destination", "truck", "trailer", "driver", "notes",
            "weighbridge_readings", "waybill", "proof_of_delivery", "audit_events", "allowed_actions",
        )

    def get_allowed_actions(self, obj):
        from .services import allowed_actions
        return allowed_actions(obj, self.context["membership"])


class TransitionSerializer(serializers.Serializer):
    version = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(max_length=500, trim_whitespace=True)


class WaybillCreateSerializer(serializers.Serializer):
    version = serializers.IntegerField(min_value=1)
    number = serializers.CharField(required=False, max_length=40, trim_whitespace=True)
