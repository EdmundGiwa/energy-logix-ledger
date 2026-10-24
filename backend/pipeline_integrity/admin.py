from django.contrib import admin

from organizations.models import Membership

from .models import CPSurveyPoint, Hydrotest, InspectionRecord, PigRun, PipelineAsset, PipelineAuditEvent, ROWObservation


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


@admin.register(PipelineAsset)
class PipelineAssetAdmin(TenantScopedAdmin):
    list_display = ("reference", "name", "organization", "fluid_type", "governing_code", "is_active", "updated_at")
    list_filter = ("fluid_type", "governing_code", "is_active", "organization")
    search_fields = ("reference", "name", "public_id")
    ordering = ("name",)
    date_hierarchy = "created_at"
    list_select_related = ("organization",)
    readonly_fields = tuple(field.name for field in PipelineAsset._meta.fields)


@admin.register(PigRun)
class PigRunAdmin(TenantScopedAdmin):
    list_display = ("reference", "asset", "organization", "pig_type", "status", "updated_at")
    list_filter = ("status", "pig_type", "organization", "created_at")
    search_fields = ("reference", "pig_type", "asset__reference", "asset__name", "public_id")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("organization", "asset", "created_by", "updated_by")
    readonly_fields = tuple(field.name for field in PigRun._meta.fields)


@admin.register(Hydrotest)
class HydrotestAdmin(TenantScopedAdmin):
    list_display = ("reference", "asset", "organization", "test_pressure_bar", "hold_duration_minutes", "status", "updated_at")
    list_filter = ("status", "organization", "created_at", "completed_at")
    search_fields = ("reference", "asset__reference", "asset__name", "public_id")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("organization", "asset", "created_by", "updated_by")
    readonly_fields = tuple(field.name for field in Hydrotest._meta.fields)


@admin.register(PipelineAuditEvent)
class PipelineAuditEventAdmin(TenantScopedAdmin):
    list_display = ("action", "organization", "actor", "from_status", "to_status", "created_at")
    list_filter = ("action", "organization", "from_status", "to_status", "created_at")
    search_fields = ("actor__email", "reason", "public_id", "request_id", "asset__reference", "pig_run__reference", "hydrotest__reference")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("organization", "actor", "asset", "pig_run", "hydrotest")
    readonly_fields = tuple(field.name for field in PipelineAuditEvent._meta.fields)


@admin.register(InspectionRecord)
class InspectionRecordAdmin(TenantScopedAdmin):
    list_display = ("reference", "asset", "organization", "inspection_type", "result", "inspected_at")
    list_filter = ("inspection_type", "result", "organization", "inspected_at")
    search_fields = ("reference", "subject_reference", "inspector_name", "asset__reference", "asset__name", "public_id")
    ordering = ("-inspected_at",)
    date_hierarchy = "inspected_at"
    list_select_related = ("organization", "asset", "created_by")
    readonly_fields = tuple(field.name for field in InspectionRecord._meta.fields)


@admin.register(CPSurveyPoint)
class CPSurveyPointAdmin(TenantScopedAdmin):
    list_display = ("reference", "asset", "organization", "kp", "potential_mv", "surveyed_at")
    list_filter = ("electrode", "organization", "surveyed_at")
    search_fields = ("reference", "surveyor_name", "asset__reference", "asset__name", "public_id")
    ordering = ("-surveyed_at", "kp")
    date_hierarchy = "surveyed_at"
    list_select_related = ("organization", "asset", "created_by")
    readonly_fields = tuple(field.name for field in CPSurveyPoint._meta.fields)


@admin.register(ROWObservation)
class ROWObservationAdmin(TenantScopedAdmin):
    list_display = ("reference", "asset", "organization", "category", "severity", "status", "observed_at")
    list_filter = ("severity", "status", "organization", "observed_at")
    search_fields = ("reference", "category", "observer_name", "description", "asset__reference", "asset__name", "public_id")
    ordering = ("-observed_at",)
    date_hierarchy = "observed_at"
    list_select_related = ("organization", "asset", "created_by")
    readonly_fields = tuple(field.name for field in ROWObservation._meta.fields)
