from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import AuthenticationEvent, User


@admin.register(User)
class PetroLedgerUserAdmin(UserAdmin):
    list_display = ("username", "email", "is_staff", "is_active", "date_joined")
    list_filter = ("is_staff", "is_superuser", "is_active", "groups")
    search_fields = ("username", "first_name", "last_name", "email", "public_id")
    ordering = ("username",)
    readonly_fields = ("public_id", "last_login", "date_joined")
    fieldsets = UserAdmin.fieldsets + (("PetroLedger", {"fields": ("public_id",)}),)

    def has_add_permission(self, request):
        return request.user.is_superuser and super().has_add_permission(request)

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if request.user.is_superuser:
            return queryset
        organization_ids = request.user.memberships.filter(is_active=True).values_list("organization_id", flat=True)
        return queryset.filter(memberships__organization_id__in=organization_ids, memberships__is_active=True).distinct()

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser and super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser and super().has_delete_permission(request, obj)


@admin.register(AuthenticationEvent)
class AuthenticationEventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "outcome", "user", "organization", "ip_address", "created_at")
    list_filter = ("event_type", "outcome", "created_at")
    search_fields = ("public_id", "user__email", "organization__name", "ip_address")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("user", "organization")
    readonly_fields = (
        "public_id",
        "user",
        "organization",
        "event_type",
        "outcome",
        "ip_address",
        "user_agent",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if request.user.is_superuser:
            return queryset
        organization_ids = request.user.memberships.filter(is_active=True).values_list("organization_id", flat=True)
        return queryset.filter(organization_id__in=organization_ids)
