from django.contrib import admin

from organizations.models import Membership

from .models import BunkerAuditEvent, BunkerDeliveryNote, Nomination, Sounding


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

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Nomination)
class NominationAdmin(TenantScopedAdmin):
    list_display = ("reference", "organization", "vessel_name", "customer_name", "product_grade", "nominated_quantity_mt", "status", "updated_at")
    list_filter = ("status", "product_grade", "organization", "delivery_window_start", "created_at")
    search_fields = ("reference", "vessel_name", "imo_number", "customer_name", "port", "public_id")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("organization", "created_by", "updated_by")
    readonly_fields = ("public_id", "organization", "reference", "status", "version", "created_by", "updated_by", "created_at", "updated_at")

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Sounding)
class SoundingAdmin(TenantScopedAdmin):
    list_display = ("tank_reference", "nomination", "organization", "reviewed_mass_mt", "status", "recorded_by", "reviewed_at")
    list_filter = ("status", "organization", "created_at", "reviewed_at")
    search_fields = ("tank_reference", "nomination__reference", "nomination__vessel_name", "public_id")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("organization", "nomination", "recorded_by", "reviewed_by")
    readonly_fields = tuple(field.name for field in Sounding._meta.fields)

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(BunkerDeliveryNote)
class BunkerDeliveryNoteAdmin(TenantScopedAdmin):
    list_display = ("number", "nomination", "organization", "delivered_quantity_mt", "status", "approved_at", "issued_at")
    list_filter = ("status", "organization", "approved_at", "issued_at", "created_at")
    search_fields = ("number", "nomination__reference", "nomination__vessel_name", "public_id")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("organization", "nomination", "created_by", "approved_by", "issued_by")
    readonly_fields = tuple(field.name for field in BunkerDeliveryNote._meta.fields)

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(BunkerAuditEvent)
class BunkerAuditEventAdmin(TenantScopedAdmin):
    list_display = ("action", "outcome", "nomination", "organization", "actor", "request_id", "from_status", "to_status", "created_at")
    list_filter = ("action", "outcome", "organization", "from_status", "to_status", "created_at")
    search_fields = ("nomination__reference", "actor__email", "reason", "public_id", "request_id")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("organization", "nomination", "actor")
    readonly_fields = tuple(field.name for field in BunkerAuditEvent._meta.fields)

    def has_change_permission(self, request, obj=None):
        return False
