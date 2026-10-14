from django.contrib import admin

from organizations.models import Membership

from .models import Customer, DeliveryLocation, Dispatch, Driver, ElectronicWaybill, Fleet, FleetAuditEvent, HaulageAuditEvent, ProofOfDelivery, Trailer, Truck, WeighbridgeReading


class TenantScopedAdmin(admin.ModelAdmin):
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if request.user.is_superuser:
            return queryset
        organization_ids = Membership.objects.filter(user=request.user, is_active=True).values("organization_id")
        return queryset.filter(organization_id__in=organization_ids)

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


@admin.register(Fleet)
class FleetAdmin(TenantScopedAdmin):
    list_display = ("reference", "organization", "status", "customer", "truck", "driver", "updated_at")
    list_filter = ("status", "organization", "created_at")
    search_fields = ("reference", "customer__name", "truck__registration_number", "driver__full_name", "public_id")
    ordering = ("organization", "-updated_at")
    list_select_related = ("organization", "customer", "truck", "driver")
    readonly_fields = tuple(field.name for field in Fleet._meta.fields)


@admin.register(FleetAuditEvent)
class FleetAuditEventAdmin(TenantScopedAdmin):
    list_display = ("fleet", "organization", "action", "stage", "actor", "created_at")
    list_filter = ("action", "stage", "organization", "created_at")
    search_fields = ("fleet__reference", "actor__email", "public_id")
    ordering = ("organization", "-created_at")
    list_select_related = ("fleet", "organization", "actor")
    readonly_fields = tuple(field.name for field in FleetAuditEvent._meta.fields)


@admin.register(Customer)
class CustomerAdmin(TenantScopedAdmin):
    list_display = ("name", "organization", "contact_name", "is_active", "updated_at")
    list_filter = ("is_active", "organization", "created_at")
    search_fields = ("name", "contact_name", "public_id")
    ordering = ("organization", "name")
    list_select_related = ("organization",)
    readonly_fields = tuple(field.name for field in Customer._meta.fields)


@admin.register(DeliveryLocation)
class DeliveryLocationAdmin(TenantScopedAdmin):
    list_display = ("name", "organization", "contact_name", "is_active", "updated_at")
    list_filter = ("is_active", "organization", "created_at")
    search_fields = ("name", "address", "contact_name", "public_id")
    ordering = ("organization", "name")
    list_select_related = ("organization",)
    readonly_fields = tuple(field.name for field in DeliveryLocation._meta.fields)


@admin.register(Truck)
class TruckAdmin(TenantScopedAdmin):
    list_display = ("registration_number", "fleet_number", "organization", "capacity_litres", "is_active", "updated_at")
    list_filter = ("is_active", "organization", "created_at")
    search_fields = ("registration_number", "fleet_number", "make_model", "public_id")
    ordering = ("organization", "registration_number")
    list_select_related = ("organization",)
    readonly_fields = tuple(field.name for field in Truck._meta.fields)


@admin.register(Trailer)
class TrailerAdmin(TenantScopedAdmin):
    list_display = ("registration_number", "fleet_number", "organization", "capacity_litres", "calibration_expires_on", "is_active")
    list_filter = ("is_active", "organization", "calibration_expires_on", "created_at")
    search_fields = ("registration_number", "fleet_number", "public_id")
    ordering = ("organization", "registration_number")
    list_select_related = ("organization",)
    readonly_fields = tuple(field.name for field in Trailer._meta.fields)


@admin.register(Driver)
class DriverAdmin(TenantScopedAdmin):
    list_display = ("full_name", "organization", "licence_expires_on", "is_active")
    list_filter = ("is_active", "organization", "licence_expires_on", "created_at")
    search_fields = ("full_name", "public_id")
    ordering = ("organization", "full_name")
    list_select_related = ("organization",)
    readonly_fields = tuple(field.name for field in Driver._meta.fields)


@admin.register(Dispatch)
class DispatchAdmin(TenantScopedAdmin):
    list_display = ("reference", "organization", "truck", "driver", "customer", "status", "scheduled_departure_at", "updated_at")
    list_filter = ("status", "organization", "product", "scheduled_departure_at", "created_at")
    search_fields = ("reference", "truck__registration_number", "driver__full_name", "customer__name", "waybill__number", "public_id")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("organization", "truck", "driver", "customer", "origin", "destination", "created_by", "updated_by")
    readonly_fields = tuple(field.name for field in Dispatch._meta.fields)


@admin.register(WeighbridgeReading)
class WeighbridgeReadingAdmin(TenantScopedAdmin):
    list_display = ("dispatch", "kind", "weight_kg", "source", "weighbridge_name", "organization", "captured_at")
    list_filter = ("kind", "source", "organization", "captured_at")
    search_fields = ("dispatch__reference", "ticket_number", "weighbridge_name", "public_id")
    ordering = ("-captured_at",)
    date_hierarchy = "captured_at"
    list_select_related = ("organization", "dispatch", "recorded_by")
    readonly_fields = tuple(field.name for field in WeighbridgeReading._meta.fields)


@admin.register(ElectronicWaybill)
class ElectronicWaybillAdmin(TenantScopedAdmin):
    list_display = ("number", "dispatch", "organization", "issued_by", "issued_at")
    list_filter = ("organization", "issued_at")
    search_fields = ("number", "dispatch__reference", "dispatch__truck__registration_number", "public_id")
    ordering = ("-issued_at",)
    date_hierarchy = "issued_at"
    list_select_related = ("organization", "dispatch", "issued_by")
    readonly_fields = tuple(field.name for field in ElectronicWaybill._meta.fields)


@admin.register(ProofOfDelivery)
class ProofOfDeliveryAdmin(TenantScopedAdmin):
    list_display = ("dispatch", "organization", "delivered_quantity_litres", "receiver_name", "water_paste_result", "receiver_acknowledged_at")
    list_filter = ("water_paste_result", "organization", "receiver_acknowledged_at", "created_at")
    search_fields = ("dispatch__reference", "receiver_name", "receiver_title", "public_id")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("organization", "dispatch", "recorded_by")
    readonly_fields = tuple(field.name for field in ProofOfDelivery._meta.fields)


@admin.register(HaulageAuditEvent)
class HaulageAuditEventAdmin(TenantScopedAdmin):
    list_display = ("action", "outcome", "dispatch", "organization", "actor", "request_id", "from_status", "to_status", "created_at")
    list_filter = ("action", "outcome", "organization", "from_status", "to_status", "created_at")
    search_fields = ("dispatch__reference", "actor__email", "reason", "public_id", "request_id")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("organization", "dispatch", "actor")
    readonly_fields = tuple(field.name for field in HaulageAuditEvent._meta.fields)
