from django.contrib import admin

from marine_stores.models import (
    InventoryMovement,
    MarineCatalogueItem,
    RefrigerantCylinder,
    StoreInventoryItem,
    StoreOrder,
    StoreOrderItem,
)
from organizations.models import Membership


class TenantScopedAdmin(admin.ModelAdmin):
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if request.user.is_superuser:
            return queryset
        organizations = Membership.objects.filter(user=request.user, is_active=True).values("organization_id")
        return queryset.filter(organization_id__in=organizations)

    def has_view_permission(self, request, obj=None):
        allowed = super().has_view_permission(request, obj)
        if not allowed or obj is None or request.user.is_superuser:
            return allowed
        return Membership.objects.filter(user=request.user, organization=obj.organization, is_active=True).exists()

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(MarineCatalogueItem)
class MarineCatalogueItemAdmin(TenantScopedAdmin):
    list_display = ("item_code", "name", "category", "unit_of_measure", "brand", "impa_code", "minimum_stock_level", "is_active", "organization")
    list_filter = ("organization", "category", "is_active")
    search_fields = ("item_code", "name", "impa_code", "brand")
    readonly_fields = ("public_id", "created_at", "updated_at")


@admin.register(StoreInventoryItem)
class StoreInventoryItemAdmin(TenantScopedAdmin):
    list_display = ("item", "location", "quantity_on_hand", "batch_or_lot_number", "unit_cost_minor", "currency", "expires_on", "organization")
    list_filter = ("organization", "location", "storage_condition")
    search_fields = ("item__item_code", "item__name", "location", "batch_or_lot_number", "serial_number")
    readonly_fields = ("public_id", "created_at", "updated_at")


@admin.register(RefrigerantCylinder)
class RefrigerantCylinderAdmin(TenantScopedAdmin):
    list_display = ("cylinder_serial", "gas_type", "tare_weight_kg", "gross_weight_kg", "net_gas_weight_kg", "status", "assigned_vessel_or_facility", "marpol_compliant", "organization")
    list_filter = ("organization", "status", "gas_type", "marpol_compliant")
    search_fields = ("cylinder_serial", "assigned_vessel_or_facility")
    readonly_fields = ("public_id", "created_at", "updated_at")


class StoreOrderItemInline(admin.TabularInline):
    model = StoreOrderItem
    extra = 0
    readonly_fields = ("public_id", "catalogue_item", "quantity_requested", "quantity_delivered", "unit_price_minor", "currency")
    can_delete = False


@admin.register(StoreOrder)
class StoreOrderAdmin(TenantScopedAdmin):
    list_display = ("order_number", "vessel_or_installation", "destination", "status", "total_minor", "currency", "requested_delivery_date", "version", "organization")
    list_filter = ("organization", "status")
    search_fields = ("order_number", "vessel_or_installation", "destination", "receiving_officer_name")
    readonly_fields = ("public_id", "order_number", "version", "delivered_at", "total_minor", "created_at", "updated_at")
    inlines = (StoreOrderItemInline,)


@admin.register(InventoryMovement)
class InventoryMovementAdmin(TenantScopedAdmin):
    list_display = ("catalogue_item", "movement_type", "quantity_delta", "resulting_quantity", "location", "actor", "created_at", "organization")
    list_filter = ("organization", "movement_type")
    search_fields = ("catalogue_item__item_code", "catalogue_item__name", "location", "reason")
    readonly_fields = ("public_id", "catalogue_item", "movement_type", "quantity_delta", "resulting_quantity", "location", "reference_order", "actor", "reason", "created_at")
