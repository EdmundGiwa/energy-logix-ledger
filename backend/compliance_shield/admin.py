from django.contrib import admin

from compliance_shield.models import (
    AuditNonConformance,
    ComplianceAuditEvent,
    ComplianceEvidencePack,
    IsoManagementSystemAudit,
    RegulatoryCertificate,
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


class AuditNonConformanceInline(admin.TabularInline):
    model = AuditNonConformance
    extra = 0
    readonly_fields = ("ncr_number", "severity", "finding_description", "target_closure_date", "status", "assigned_to")
    can_delete = False


@admin.register(RegulatoryCertificate)
class RegulatoryCertificateAdmin(TenantScopedAdmin):
    list_display = (
        "certificate_number", "regulator", "certificate_type", "issuing_authority",
        "status", "issue_date", "expiry_date", "days_to_expiry", "urgency_tier", "organization",
    )
    list_filter = ("organization", "regulator", "status")
    search_fields = ("certificate_number", "certificate_type", "issuing_authority", "renewal_tracking_number")
    readonly_fields = ("public_id", "days_to_expiry", "urgency_tier", "verified_by", "verified_at", "version", "created_at", "updated_at")


@admin.register(IsoManagementSystemAudit)
class IsoManagementSystemAuditAdmin(TenantScopedAdmin):
    list_display = (
        "standard", "audit_type", "certification_body", "lead_auditor",
        "audit_date", "next_audit_due", "overall_outcome", "open_ncrs_count", "organization",
    )
    list_filter = ("organization", "standard", "audit_type", "overall_outcome")
    search_fields = ("standard", "certification_body", "lead_auditor", "certificate_number")
    readonly_fields = ("public_id", "open_ncrs_count", "closed_ncrs_count", "created_at", "updated_at")
    inlines = (AuditNonConformanceInline,)


@admin.register(AuditNonConformance)
class AuditNonConformanceAdmin(TenantScopedAdmin):
    list_display = (
        "ncr_number", "audit", "severity", "target_closure_date",
        "closed_at", "status", "assigned_to", "organization",
    )
    list_filter = ("organization", "severity", "status")
    search_fields = ("ncr_number", "finding_description", "assigned_to")
    readonly_fields = ("public_id", "closed_at", "created_at", "updated_at")


@admin.register(ComplianceEvidencePack)
class ComplianceEvidencePackAdmin(TenantScopedAdmin):
    list_display = (
        "pack_name", "target_stakeholder", "status", "compiled_by", "compiled_at", "organization",
    )
    list_filter = ("organization", "status")
    search_fields = ("pack_name", "target_stakeholder")
    readonly_fields = ("public_id", "dossier_data", "compiled_by", "compiled_at", "created_at", "updated_at")


@admin.register(ComplianceAuditEvent)
class ComplianceAuditEventAdmin(TenantScopedAdmin):
    list_display = ("entity_type", "entity_id", "action", "from_status", "to_status", "actor", "created_at", "organization")
    list_filter = ("organization", "entity_type", "action")
    search_fields = ("entity_id", "action", "reason")
    readonly_fields = ("public_id", "entity_type", "entity_id", "actor", "action", "from_status", "to_status", "reason", "metadata", "created_at")
