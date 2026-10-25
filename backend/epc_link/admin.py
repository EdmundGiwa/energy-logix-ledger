from django.contrib import admin

from epc_link.models import (
    ApprovedVendor,
    EpcLinkAuditEvent,
    MaterialIssueSlip,
    MaterialIssueSlipItem,
    MaterialRequisition,
    PipeYardItem,
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


class MaterialIssueSlipItemInline(admin.TabularInline):
    model = MaterialIssueSlipItem
    extra = 0
    readonly_fields = ("yard_item", "quantity_issued", "notes")
    can_delete = False


@admin.register(ApprovedVendor)
class ApprovedVendorAdmin(TenantScopedAdmin):
    list_display = (
        "vendor_code", "vendor_name", "category", "status", "audit_rating",
        "nogic_jqs_id", "nuprc_permit_ref", "organization",
    )
    list_filter = ("organization", "category", "status", "audit_rating")
    search_fields = ("vendor_code", "vendor_name", "nogic_jqs_id", "nuprc_permit_ref")
    readonly_fields = ("public_id", "created_at", "updated_at")


@admin.register(MaterialRequisition)
class MaterialRequisitionAdmin(TenantScopedAdmin):
    list_display = (
        "requisition_number", "project_name", "client_name", "priority",
        "status", "required_date", "version", "requested_by", "organization",
    )
    list_filter = ("organization", "status", "priority")
    search_fields = ("requisition_number", "project_name", "client_name", "wbs_code")
    readonly_fields = ("public_id", "requisition_number", "version", "requested_by", "approved_by", "approved_at", "created_at", "updated_at")


@admin.register(PipeYardItem)
class PipeYardItemAdmin(TenantScopedAdmin):
    list_display = (
        "item_tag", "material_type", "grade_specification", "outer_diameter_inches",
        "wall_thickness_mm", "quantity", "unit_of_measure", "heat_number",
        "mtc_type", "status", "yard_location", "organization",
    )
    list_filter = ("organization", "material_type", "status", "mtc_type", "yard_location")
    search_fields = ("item_tag", "grade_specification", "heat_number", "mtc_number", "mill_manufacturer", "qr_tag")
    readonly_fields = ("public_id", "item_tag", "qr_tag", "created_at", "updated_at")


@admin.register(MaterialIssueSlip)
class MaterialIssueSlipAdmin(TenantScopedAdmin):
    list_display = (
        "issue_slip_number", "requisition", "issued_to", "contractor_name",
        "issued_date", "issued_by", "organization",
    )
    list_filter = ("organization", "issued_date")
    search_fields = ("issue_slip_number", "requisition__requisition_number", "contractor_name", "issued_to")
    readonly_fields = ("public_id", "issue_slip_number", "issued_by", "created_at")
    inlines = (MaterialIssueSlipItemInline,)


@admin.register(EpcLinkAuditEvent)
class EpcLinkAuditEventAdmin(TenantScopedAdmin):
    list_display = ("entity_type", "entity_id", "action", "from_status", "to_status", "actor", "created_at", "organization")
    list_filter = ("organization", "entity_type", "action")
    search_fields = ("entity_id", "action", "reason")
    readonly_fields = ("public_id", "entity_type", "entity_id", "actor", "action", "from_status", "to_status", "reason", "metadata", "created_at")
