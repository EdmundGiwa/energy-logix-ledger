from django.contrib import admin
from organizations.models import Membership
from client_portal.models import (
    ClientPortalProfile,
    SharedDeliverablePackage,
    ClientPortalAccessLog,
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


@admin.register(ClientPortalProfile)
class ClientPortalProfileAdmin(TenantScopedAdmin):
    list_display = ("client_name", "user", "client_customer_code", "is_active", "organization", "created_at")
    list_filter = ("organization", "is_active")
    search_fields = ("client_name", "client_customer_code", "user__email", "user__username")
    readonly_fields = ("public_id", "created_at", "updated_at")


@admin.register(SharedDeliverablePackage)
class SharedDeliverablePackageAdmin(TenantScopedAdmin):
    list_display = ("title", "deliverable_type", "client_name", "source_reference", "verification_seal", "organization", "created_at")
    list_filter = ("organization", "deliverable_type")
    search_fields = ("title", "client_name", "source_reference", "verification_seal")
    readonly_fields = ("public_id", "verification_seal", "created_at", "updated_at")


@admin.register(ClientPortalAccessLog)
class ClientPortalAccessLogAdmin(TenantScopedAdmin):
    list_display = ("action", "client_name", "resource_type", "resource_reference", "ip_address", "organization", "accessed_at")
    list_filter = ("organization", "action", "resource_type")
    search_fields = ("client_name", "resource_reference", "action", "ip_address")
    readonly_fields = ("public_id", "accessed_at")
