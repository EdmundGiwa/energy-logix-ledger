from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils.html import format_html
from rest_framework.exceptions import PermissionDenied as ApiPermissionDenied
from rest_framework.exceptions import ValidationError as ApiValidationError

from .forms import ModuleSelectionForm
from .models import Membership, ModuleAccessRequest, ModuleEntitlementEvent, Organization, OrganizationModule
from .modules import MODULES
from .services import enabled_modules, resolve_module_request, set_organization_modules


def api_error_text(exc) -> str:
    """Flatten a DRF ValidationError/PermissionDenied into one admin message."""
    detail = exc.detail
    if isinstance(detail, dict):
        return " ".join(str(m) for msgs in detail.values() for m in (msgs if isinstance(msgs, list) else [msgs]))
    if isinstance(detail, list):
        return " ".join(str(m) for m in detail)
    return str(detail)


# OrganizationModule is deliberately not registered on its own: rows change only through
# \u201cManage modules\u201d (set_organization_modules), which also writes the audit history.
class OrganizationModuleInline(admin.TabularInline):
    model = OrganizationModule
    extra = 0
    can_delete = False
    fields = ("module", "enabled_by", "created_at")
    readonly_fields = fields
    verbose_name_plural = "Optional modules switched on (change with \u201cManage modules\u201d)"

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


class ModuleEntitlementEventInline(admin.TabularInline):
    model = ModuleEntitlementEvent
    extra = 0
    can_delete = False
    fields = ("created_at", "module", "action", "actor", "reason")
    readonly_fields = fields
    verbose_name_plural = "Module history"

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "status", "requested_plan", "module_summary", "created_at", "updated_at")
    list_filter = ("status", "requested_plan", "created_at")
    search_fields = ("name", "slug", "public_id")
    ordering = ("name",)
    date_hierarchy = "created_at"
    readonly_fields = ("public_id", "manage_modules_link", "created_at", "updated_at")
    inlines = (OrganizationModuleInline, ModuleEntitlementEventInline)
    actions = ("resend_owner_invite",)

    @admin.display(description="Modules")
    def module_summary(self, obj):
        return ", ".join(MODULES[m] for m in sorted(enabled_modules(obj), key=MODULES.get))

    @admin.display(description="Modules")
    def manage_modules_link(self, obj):
        if not obj.pk:
            return "—"
        return format_html('<a class="button" href="{}">Manage modules</a>', reverse("admin:organizations_organization_modules", args=[obj.pk]))

    def get_urls(self):
        custom = [
            path("<int:pk>/modules/", self.admin_site.admin_view(self.modules_view), name="organizations_organization_modules"),
        ]
        return custom + super().get_urls()

    def modules_view(self, request, pk):
        if not request.user.is_superuser:
            raise PermissionDenied
        organization = get_object_or_404(Organization, pk=pk)
        current = sorted(organization.module_entitlements.values_list("module", flat=True))
        form = ModuleSelectionForm(request.POST or None, initial={"modules": current})
        if request.method == "POST" and form.is_valid():
            try:
                set_organization_modules(
                    organization=organization, modules=form.cleaned_data["modules"], actor=request.user, reason=form.cleaned_data["reason"]
                )
            except (ApiValidationError, ApiPermissionDenied) as exc:
                form.add_error(None, api_error_text(exc))
            else:
                self.message_user(request, f"Modules updated for {organization.name}.", messages.SUCCESS)
                return redirect("admin:organizations_organization_change", organization.pk)
        back = reverse("admin:organizations_organization_change", args=[organization.pk])
        return TemplateResponse(
            request,
            "admin/organizations/offshora_form.html",
            {
                **self.admin_site.each_context(request),
                "title": f"Modules for {organization.name}",
                "intro": "Tick the optional modules this customer has bought. Core modules are always on. Every change is recorded with your name and reason.",
                "form": form,
                "submit_label": "Save modules",
                "back_url": back,
                "back_label": organization.name,
            },
        )

    @admin.action(description="Resend the owner\u2019s set-password invite")
    def resend_owner_invite(self, request, queryset):
        from identity.services import send_account_invite

        for organization in queryset:
            owner = organization.memberships.filter(role=Membership.Role.OWNER, is_active=True).select_related("user").first()
            if owner is None:
                self.message_user(request, f"{organization.name} has no active owner.", messages.ERROR)
            elif owner.user.has_usable_password():
                self.message_user(request, f"{owner.user.email} has already set a password; they can use \u201cForgot password?\u201d.", messages.WARNING)
            else:
                send_account_invite(user=owner.user, organization=organization, invited_by=request.user)
                self.message_user(request, f"New invite sent to {owner.user.email}.", messages.SUCCESS)

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


@admin.register(ModuleAccessRequest)
class ModuleAccessRequestAdmin(admin.ModelAdmin):
    list_display = ("organization", "module", "status", "requested_by", "created_at", "resolved_by", "resolved_at")
    list_filter = ("status", "module", "created_at")
    search_fields = ("organization__name", "requested_by__email", "public_id")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("organization", "requested_by", "resolved_by")
    readonly_fields = ("public_id", "organization", "module", "requested_by", "message", "status", "resolved_by", "resolved_at", "created_at")
    actions = ("approve", "decline")

    def has_module_permission(self, request):
        return request.user.is_active and request.user.is_superuser

    def has_view_permission(self, request, obj=None):
        return request.user.is_active and request.user.is_superuser

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return request.user.is_active and request.user.is_superuser  # for actions; all fields read-only

    def has_delete_permission(self, request, obj=None):
        return False

    def _resolve(self, request, queryset, approve):
        for access_request in queryset:
            resolved = resolve_module_request(access_request=access_request, approve=approve, actor=request.user)
            self.message_user(request, f"{resolved.organization.name} · {resolved.get_module_display()}: {resolved.get_status_display()}.", messages.SUCCESS)

    @admin.action(description="Approve and switch the module on")
    def approve(self, request, queryset):
        self._resolve(request, queryset, approve=True)

    @admin.action(description="Decline")
    def decline(self, request, queryset):
        self._resolve(request, queryset, approve=False)


@admin.register(ModuleEntitlementEvent)
class ModuleEntitlementEventAdmin(admin.ModelAdmin):
    list_display = ("organization", "module", "action", "actor", "reason", "created_at")
    list_filter = ("action", "module", "created_at")
    search_fields = ("organization__name", "actor__email", "reason")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("organization", "actor")
    readonly_fields = ("organization", "module", "action", "actor", "reason", "created_at")

    def has_module_permission(self, request):
        return request.user.is_active and request.user.is_superuser

    def has_view_permission(self, request, obj=None):
        return request.user.is_active and request.user.is_superuser

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
