from django.contrib import admin

from organizations.models import Membership
from refinery_link.models import (
    BatchQualityCertificate,
    DepotTank,
    GantryMeterTicket,
    OfftakeAppointment,
    RefineryAuditEvent,
    TankGaugeDip,
    Terminal,
)


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


@admin.register(Terminal)
class TerminalAdmin(TenantScopedAdmin):
    list_display = ("code", "name", "location", "organization", "is_active", "created_at")
    list_filter = ("organization", "is_active")
    search_fields = ("code", "name", "location")
    readonly_fields = ("public_id", "created_at", "updated_at")


@admin.register(DepotTank)
class DepotTankAdmin(TenantScopedAdmin):
    list_display = ("tank_number", "terminal", "product_type", "nominal_capacity_litres", "current_status", "organization")
    list_filter = ("organization", "product_type", "current_status", "terminal")
    search_fields = ("tank_number", "terminal__code", "terminal__name")
    readonly_fields = ("public_id", "created_at", "updated_at")


@admin.register(OfftakeAppointment)
class OfftakeAppointmentAdmin(TenantScopedAdmin):
    list_display = ("reference", "terminal", "truck_plate", "driver_name", "product_type", "nominated_volume_litres", "status", "version", "scheduled_at", "organization")
    list_filter = ("organization", "status", "product_type", "terminal")
    search_fields = ("reference", "truck_plate", "driver_name", "rfid_tag", "holding_park_slot")
    readonly_fields = ("public_id", "reference", "version", "checked_in_at", "called_up_at", "completed_at", "created_at", "updated_at")


@admin.register(TankGaugeDip)
class TankGaugeDipAdmin(TenantScopedAdmin):
    list_display = ("reference", "tank", "dip_type", "observed_level_mm", "gross_observed_volume_litres", "net_standard_volume_litres", "recorded_at", "operator_name", "organization")
    list_filter = ("organization", "dip_type", "tank__product_type")
    search_fields = ("reference", "tank__tank_number", "operator_name")
    readonly_fields = ("public_id", "reference", "created_at")


@admin.register(GantryMeterTicket)
class GantryMeterTicketAdmin(TenantScopedAdmin):
    list_display = ("ticket_number", "appointment", "tank", "meter_id", "gross_volume_litres", "net_volume_litres", "variance_percent", "status", "completed_at", "organization")
    list_filter = ("organization", "status", "meter_id")
    search_fields = ("ticket_number", "meter_id", "appointment__reference", "appointment__truck_plate")
    readonly_fields = ("public_id", "ticket_number", "variance_litres", "variance_percent", "status", "created_at")


@admin.register(BatchQualityCertificate)
class BatchQualityCertificateAdmin(TenantScopedAdmin):
    list_display = ("certificate_number", "product_type", "batch_number", "density_at_15c", "sulphur_ppm", "is_compliant_nmdpra", "laboratory_name", "tested_at", "organization")
    list_filter = ("organization", "product_type", "is_compliant_nmdpra")
    search_fields = ("certificate_number", "batch_number", "laboratory_name", "authorized_chemist")
    readonly_fields = ("public_id", "certificate_number", "created_at")


@admin.register(RefineryAuditEvent)
class RefineryAuditEventAdmin(TenantScopedAdmin):
    list_display = ("target_type", "action", "from_status", "to_status", "actor", "created_at", "organization")
    list_filter = ("organization", "target_type", "action")
    search_fields = ("action", "target_type", "reason")
    readonly_fields = ("public_id", "actor", "action", "target_type", "target_id", "from_status", "to_status", "reason", "metadata", "created_at", "organization")
