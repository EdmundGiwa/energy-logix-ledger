from django.contrib import admin

from organizations.models import Membership
from tank_works.models import (
    CoatingInspection,
    CrewEquipmentUtilization,
    SludgeWasteManifest,
    TankFieldJob,
    TankWorksAuditEvent,
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


class SludgeWasteManifestInline(admin.TabularInline):
    model = SludgeWasteManifest
    extra = 0
    readonly_fields = ("manifest_number", "waste_classification", "quantity", "unit_of_measure", "transporter_name", "disposal_facility")
    can_delete = False


class CoatingInspectionInline(admin.TabularInline):
    model = CoatingInspection
    extra = 0
    readonly_fields = ("surface_location", "measured_avg_dft_microns", "specified_dft_microns", "passed", "inspector_name")
    can_delete = False


@admin.register(TankFieldJob)
class TankFieldJobAdmin(TenantScopedAdmin):
    list_display = (
        "job_number", "client_name", "terminal_or_facility", "tank_identifier",
        "scope_of_work", "status", "gas_test_cleared", "estimated_cost_minor",
        "currency", "version", "organization",
    )
    list_filter = ("organization", "status", "scope_of_work", "gas_test_cleared")
    search_fields = ("job_number", "client_name", "terminal_or_facility", "tank_identifier", "safepass_permit_ref")
    readonly_fields = ("public_id", "job_number", "version", "started_at", "completed_at", "created_at", "updated_at")
    inlines = (SludgeWasteManifestInline, CoatingInspectionInline)


@admin.register(SludgeWasteManifest)
class SludgeWasteManifestAdmin(TenantScopedAdmin):
    list_display = (
        "manifest_number", "job", "waste_classification", "quantity",
        "unit_of_measure", "transporter_name", "disposal_facility",
        "is_consignment_signed", "dispatched_at", "organization",
    )
    list_filter = ("organization", "waste_classification", "is_consignment_signed")
    search_fields = ("manifest_number", "transporter_name", "driver_name", "vehicle_registration", "disposal_facility")
    readonly_fields = ("public_id", "manifest_number", "created_at", "updated_at")


@admin.register(CoatingInspection)
class CoatingInspectionAdmin(TenantScopedAdmin):
    list_display = (
        "job", "surface_location", "measured_avg_dft_microns", "specified_dft_microns",
        "dft_passed", "adhesion_result_mpa", "passed", "inspector_name",
        "inspection_date", "organization",
    )
    list_filter = ("organization", "passed", "dft_passed")
    search_fields = ("surface_location", "coating_system", "inspector_name")
    readonly_fields = ("public_id", "dft_passed", "created_at", "updated_at")


@admin.register(CrewEquipmentUtilization)
class CrewEquipmentUtilizationAdmin(TenantScopedAdmin):
    list_display = (
        "job", "entry_date", "personnel_role", "headcount", "man_hours",
        "equipment_description", "equipment_hours", "organization",
    )
    list_filter = ("organization", "entry_date")
    search_fields = ("personnel_role", "equipment_description")
    readonly_fields = ("public_id", "created_at")


@admin.register(TankWorksAuditEvent)
class TankWorksAuditEventAdmin(TenantScopedAdmin):
    list_display = ("job", "action", "from_status", "to_status", "actor", "created_at", "organization")
    list_filter = ("organization", "action")
    search_fields = ("job__job_number", "action", "reason")
    readonly_fields = ("public_id", "job", "actor", "action", "from_status", "to_status", "reason", "metadata", "created_at")
