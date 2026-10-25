from django.contrib import admin
from organizations.models import Membership
from owner_dashboard.models import (
    ExecutiveExceptionAlert,
    ExecutiveExportJob,
    ExecutiveKpiSnapshot,
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


@admin.register(ExecutiveKpiSnapshot)
class ExecutiveKpiSnapshotAdmin(TenantScopedAdmin):
    list_display = ("organization", "as_of_date", "currency", "gross_billed_minor", "collected_minor", "outstanding_receivables_minor", "reconciliation_rate_percent", "created_at")
    list_filter = ("organization", "currency", "as_of_date")
    search_fields = ("organization__name", "currency")
    readonly_fields = ("public_id", "created_at", "updated_at")


@admin.register(ExecutiveExceptionAlert)
class ExecutiveExceptionAlertAdmin(TenantScopedAdmin):
    list_display = ("severity", "module", "title", "variance_percent", "is_acknowledged", "organization", "created_at")
    list_filter = ("organization", "severity", "module", "is_acknowledged")
    search_fields = ("title", "description", "source_record_id")
    readonly_fields = ("public_id", "acknowledged_by", "acknowledged_at", "created_at")


@admin.register(ExecutiveExportJob)
class ExecutiveExportJobAdmin(TenantScopedAdmin):
    list_display = ("report_type", "status", "file_format", "file_size_bytes", "requested_by", "organization", "created_at")
    list_filter = ("organization", "status", "report_type", "file_format")
    search_fields = ("report_type", "download_checksum")
    readonly_fields = ("public_id", "download_checksum", "completed_at", "created_at")
