from django.contrib import admin

from organizations.models import Membership
from .models import Credential, GasTest, HseAuditEvent, Mobilization, MobilizationWorker, Permit, SafetyAcknowledgement, SafetyProcedure, Worker


class TenantScopedReadOnlyAdmin(admin.ModelAdmin):
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if request.user.is_superuser:
            return queryset
        organizations = Membership.objects.filter(user=request.user, is_active=True).values("organization_id")
        if "organization" in {field.name for field in self.model._meta.fields}:
            return queryset.filter(organization_id__in=organizations)
        return queryset.filter(mobilization__organization_id__in=organizations) if self.model is MobilizationWorker else queryset.none()

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Worker)
class WorkerAdmin(TenantScopedReadOnlyAdmin):
    list_display = ("employee_number", "full_name", "job_title", "organization", "is_active", "updated_at")
    list_filter = ("is_active", "organization", "job_title")
    search_fields = ("employee_number", "full_name", "job_title", "email", "public_id")
    ordering = ("organization", "full_name")
    list_select_related = ("organization",)
    readonly_fields = tuple(field.name for field in Worker._meta.fields)


@admin.register(Credential)
class CredentialAdmin(TenantScopedReadOnlyAdmin):
    list_display = ("certificate_number", "kind", "worker", "organization", "status", "expires_on")
    list_filter = ("kind", "status", "organization", "expires_on")
    search_fields = ("certificate_number", "worker__full_name", "worker__employee_number", "issuer", "public_id")
    ordering = ("expires_on",)
    date_hierarchy = "expires_on"
    list_select_related = ("organization", "worker", "verified_by")
    readonly_fields = tuple(field.name for field in Credential._meta.fields)


@admin.register(SafetyProcedure)
class SafetyProcedureAdmin(TenantScopedReadOnlyAdmin):
    list_display = ("name", "site", "organization", "is_approved", "credential_buffer_days", "updated_at")
    list_filter = ("is_approved", "organization", "site")
    search_fields = ("name", "site", "public_id")
    ordering = ("organization", "name")
    list_select_related = ("organization", "approved_by")
    readonly_fields = tuple(field.name for field in SafetyProcedure._meta.fields)


@admin.register(Mobilization)
class MobilizationAdmin(TenantScopedReadOnlyAdmin):
    list_display = ("reference", "destination", "organization", "status", "scheduled_at", "updated_at")
    list_filter = ("status", "organization", "scheduled_at")
    search_fields = ("reference", "destination", "public_id")
    ordering = ("-scheduled_at",)
    date_hierarchy = "scheduled_at"
    list_select_related = ("organization", "procedure", "created_by")
    readonly_fields = tuple(field.name for field in Mobilization._meta.fields)


@admin.register(Permit)
class PermitAdmin(TenantScopedReadOnlyAdmin):
    list_display = ("reference", "kind", "title", "site", "organization", "status", "starts_at", "expires_at")
    list_filter = ("kind", "status", "organization", "site", "starts_at")
    search_fields = ("reference", "title", "site", "performing_authority__full_name", "public_id")
    ordering = ("-created_at",)
    date_hierarchy = "starts_at"
    list_select_related = ("organization", "procedure", "performing_authority", "created_by", "approved_by")
    readonly_fields = tuple(field.name for field in Permit._meta.fields)


@admin.register(MobilizationWorker)
class MobilizationWorkerAdmin(TenantScopedReadOnlyAdmin):
    list_display = ("mobilization", "worker", "is_cleared", "checked_at")
    list_filter = ("is_cleared", "checked_at")
    search_fields = ("mobilization__reference", "worker__employee_number", "worker__full_name")
    ordering = ("-checked_at", "mobilization__reference")
    list_select_related = ("mobilization", "mobilization__organization", "worker")
    readonly_fields = tuple(field.name for field in MobilizationWorker._meta.fields)


@admin.register(GasTest)
class GasTestAdmin(TenantScopedReadOnlyAdmin):
    list_display = ("permit", "tested_at", "oxygen_percent", "lel_percent", "h2s_ppm", "passed", "organization")
    list_filter = ("passed", "organization", "tested_at", "instrument_calibration_expires_on")
    search_fields = ("permit__reference", "instrument_reference", "public_id")
    ordering = ("-tested_at",)
    date_hierarchy = "tested_at"
    list_select_related = ("organization", "permit", "recorded_by")
    readonly_fields = tuple(field.name for field in GasTest._meta.fields)


@admin.register(SafetyAcknowledgement)
class SafetyAcknowledgementAdmin(TenantScopedReadOnlyAdmin):
    list_display = ("permit", "worker", "kind", "acknowledged_at", "organization")
    list_filter = ("kind", "organization", "acknowledged_at")
    search_fields = ("permit__reference", "worker__employee_number", "worker__full_name", "public_id")
    ordering = ("-acknowledged_at",)
    date_hierarchy = "acknowledged_at"
    list_select_related = ("organization", "permit", "worker")
    readonly_fields = tuple(field.name for field in SafetyAcknowledgement._meta.fields)


@admin.register(HseAuditEvent)
class HseAuditEventAdmin(TenantScopedReadOnlyAdmin):
    list_display = ("target_type", "target_id", "action", "from_status", "to_status", "actor", "organization", "created_at")
    list_filter = ("target_type", "action", "from_status", "to_status", "organization", "created_at")
    search_fields = ("target_id", "actor__email", "reason", "public_id")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("organization", "actor")
    readonly_fields = tuple(field.name for field in HseAuditEvent._meta.fields)
