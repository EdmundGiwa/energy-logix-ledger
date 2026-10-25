from rest_framework import serializers

from marine_stores.models import (
    InventoryMovement,
    MarineCatalogueItem,
    RefrigerantCylinder,
    StoreInventoryItem,
    StoreOrder,
    StoreOrderItem,
)
from marine_stores.services import ALLOWED_ORDER_TRANSITIONS


class MarineCatalogueItemSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    total_stock_on_hand = serializers.SerializerMethodField()

    class Meta:
        model = MarineCatalogueItem
        fields = (
            "id", "item_code", "name", "category", "unit_of_measure",
            "brand", "impa_code", "minimum_stock_level", "is_active",
            "total_stock_on_hand", "created_at", "updated_at",
        )
        read_only_fields = ("id", "total_stock_on_hand", "created_at", "updated_at")

    def get_total_stock_on_hand(self, obj):
        stocks = getattr(obj, "stock_levels", None)
        if stocks is not None:
            return sum(s.quantity_on_hand for s in stocks.all())
        return 0


class StoreInventoryItemSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    item_id = serializers.UUIDField(source="item.public_id", read_only=True)
    item_code = serializers.CharField(source="item.item_code", read_only=True)
    item_name = serializers.CharField(source="item.name", read_only=True)
    unit_of_measure = serializers.CharField(source="item.unit_of_measure", read_only=True)

    class Meta:
        model = StoreInventoryItem
        fields = (
            "id", "item_id", "item_code", "item_name", "unit_of_measure", "location",
            "batch_or_lot_number", "serial_number", "quantity_on_hand",
            "unit_cost_minor", "currency", "expires_on", "storage_condition",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "item_id", "item_code", "item_name", "unit_of_measure", "created_at", "updated_at")


class RefrigerantCylinderSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)

    class Meta:
        model = RefrigerantCylinder
        fields = (
            "id", "cylinder_serial", "gas_type", "tare_weight_kg",
            "gross_weight_kg", "net_gas_weight_kg", "status",
            "assigned_vessel_or_facility", "marpol_compliant",
            "recovery_logged_at", "environmental_notes",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class StoreOrderItemSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    catalogue_item_id = serializers.UUIDField(source="catalogue_item.public_id", read_only=True)
    item_code = serializers.CharField(source="catalogue_item.item_code", read_only=True)
    item_name = serializers.CharField(source="catalogue_item.name", read_only=True)
    unit_of_measure = serializers.CharField(source="catalogue_item.unit_of_measure", read_only=True)

    class Meta:
        model = StoreOrderItem
        fields = (
            "id", "catalogue_item_id", "item_code", "item_name", "unit_of_measure",
            "quantity_requested", "quantity_delivered", "unit_price_minor",
            "currency", "notes",
        )
        read_only_fields = ("id", "catalogue_item_id", "item_code", "item_name", "unit_of_measure")


class StoreOrderSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    line_items = StoreOrderItemSerializer(many=True, read_only=True)
    allowed_actions = serializers.SerializerMethodField()

    class Meta:
        model = StoreOrder
        fields = (
            "id", "order_number", "vessel_or_installation", "destination",
            "status", "requested_delivery_date", "delivered_at",
            "receiving_officer_name", "receiving_signature_ref",
            "total_minor", "currency", "version", "allowed_actions",
            "line_items", "notes", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "order_number", "status", "delivered_at", "version",
            "total_minor", "allowed_actions", "line_items", "created_at", "updated_at",
        )

    def get_allowed_actions(self, obj):
        return list(ALLOWED_ORDER_TRANSITIONS.get(obj.status, {}).keys())


class InventoryMovementSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    item_id = serializers.UUIDField(source="catalogue_item.public_id", read_only=True)
    item_code = serializers.CharField(source="catalogue_item.item_code", read_only=True)
    item_name = serializers.CharField(source="catalogue_item.name", read_only=True)
    actor_name = serializers.CharField(source="actor.get_full_name", default="", read_only=True)

    class Meta:
        model = InventoryMovement
        fields = (
            "id", "item_id", "item_code", "item_name", "movement_type",
            "quantity_delta", "resulting_quantity", "location", "actor_name",
            "reason", "created_at",
        )
        read_only_fields = ("id", "item_id", "item_code", "item_name", "movement_type", "quantity_delta", "resulting_quantity", "location", "actor_name", "reason", "created_at")
