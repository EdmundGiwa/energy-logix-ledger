from django.contrib import admin

from .models import Membership, Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "status", "requested_plan", "created_at", "updated_at")
    list_filter = ("status", "requested_plan", "created_at")
    search_fields = ("name", "slug", "public_id")
    ordering = ("name",)
    date_hierarchy = "created_at"
    readonly_fields = ("public_id", "created_at", "updated_at")

    def has_add_permission(self, request):
        return request.user.is_superuser and super().has_add_permission(request)

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if request.user.is_superuser:
            return queryset
        return queryset.filter(memberships__user=request.user, memberships__is_active=True).distinct()

    def has_view_permission(self, request, obj=None):
        allowed = super().has_view_permission(request, obj)
        return allowed and (obj is None or request.user.is_superuser or obj.memberships.filter(user=request.user, is_active=True).exists())

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser and super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser and super().has_delete_permission(request, obj)


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "organization", "role", "job_title", "is_active", "created_at")
    list_filter = ("role", "is_active", "organization", "created_at")
    search_fields = ("user__email", "user__first_name", "user__last_name", "organization__name", "public_id")
    ordering = ("organization__name", "user__email")
    date_hierarchy = "created_at"
    autocomplete_fields = ("user", "organization")
    list_select_related = ("user", "organization")
    readonly_fields = ("public_id", "created_at", "updated_at")

    def has_add_permission(self, request):
        return request.user.is_superuser and super().has_add_permission(request)

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if request.user.is_superuser:
            return queryset
        return queryset.filter(organization__memberships__user=request.user, organization__memberships__is_active=True).distinct()

    def has_view_permission(self, request, obj=None):
        allowed = super().has_view_permission(request, obj)
        return allowed and (obj is None or request.user.is_superuser or obj.organization.memberships.filter(user=request.user, is_active=True).exists())

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser and super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser and super().has_delete_permission(request, obj)
