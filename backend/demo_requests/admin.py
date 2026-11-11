from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils.html import format_html
from rest_framework.exceptions import PermissionDenied as ApiPermissionDenied
from rest_framework.exceptions import ValidationError as ApiValidationError

from organizations.admin import api_error_text
from organizations.forms import ProvisionCustomerForm
from organizations.models import Organization
from organizations.modules import CORE_MODULES
from organizations.services import provision_customer

from . import catalog
from .models import DemoRequest, DemoRequestEvent
from .services import InvalidTransition, transition_demo_request


class PlatformStaffOnlyMixin:
    """Demo requests are pre-tenant sales data: only platform superusers may see them.

    Tenant admins (staff users with organization memberships) must never see other
    companies' prospects, so non-superusers get no module, no rows and no permissions.
    """

    def has_module_permission(self, request):
        return request.user.is_active and request.user.is_superuser

    def has_view_permission(self, request, obj=None):
        return request.user.is_active and request.user.is_superuser

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset if request.user.is_superuser else queryset.none()


class DemoRequestEventInline(admin.TabularInline):
    model = DemoRequestEvent
    extra = 0
    can_delete = False
    fields = ("created_at", "from_status", "to_status", "actor", "reason")
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


def _transition_action(to_status, label):
    def action(modeladmin, request, queryset):
        moved, refused = 0, []
        for demo in queryset:
            try:
                transition_demo_request(
                    demo_request=demo, to_status=to_status, actor=request.user, reason=f"{label} in admin."
                )
                moved += 1
            except InvalidTransition as exc:
                refused.append(str(exc))
        if moved:
            modeladmin.message_user(request, f"{moved} demo request(s) {label.lower()}.", messages.SUCCESS)
        for message in refused:
            modeladmin.message_user(request, message, messages.ERROR)

    action.__name__ = f"mark_{to_status}"
    action.short_description = f"Mark selected as {label.lower()}"
    return action


@admin.register(DemoRequest)
class DemoRequestAdmin(PlatformStaffOnlyMixin, admin.ModelAdmin):
    list_display = (
        "reference",
        "company_name",
        "segment_label",
        "scheduled_start",
        "meeting_format",
        "status",
        "account",
        "company_size",
        "country_list",
        "created_at",
    )
    list_filter = ("status", "segment", "meeting_format", "company_size", "current_tools", "scheduled_start")
    search_fields = ("reference", "company_name", "work_email", "full_name")
    ordering = ("-scheduled_start",)
    date_hierarchy = "scheduled_start"
    inlines = (DemoRequestEventInline,)
    actions = (
        _transition_action(DemoRequest.Status.CONFIRMED, "Confirmed"),
        _transition_action(DemoRequest.Status.COMPLETED, "Completed"),
        _transition_action(DemoRequest.Status.NO_SHOW, "No-show"),
        _transition_action(DemoRequest.Status.CANCELLED, "Cancelled"),
    )
    fieldsets = (
        ("Booking", {"fields": ("reference", "public_id", "status", "scheduled_start", "duration_minutes",
                                "prospect_timezone", "meeting_format", "on_site_location")}),
        ("Company", {"fields": ("company_name", "company_website", "segment", "company_size", "countries",
                                "operations", "current_tools", "pain_points", "interested_modules")}),
        ("Contact", {"fields": ("full_name", "job_title", "work_email", "phone", "notes", "consent_to_contact")}),
        ("Customer account", {"fields": ("account", "converted_at")}),
        ("System", {"fields": ("created_at", "updated_at")}),
    )
    # Submissions are the prospect's own words; status changes go through actions only.
    readonly_fields = tuple(f for _, opts in fieldsets for f in opts["fields"])

    @admin.display(description="Customer account")
    def account(self, obj):
        if obj.converted_organization_id:
            url = reverse("admin:organizations_organization_change", args=[obj.converted_organization_id])
            return format_html('<a href="{}">{}</a>', url, obj.converted_organization)
        if not obj.pk:
            return "—"
        url = reverse("admin:demo_requests_demorequest_provision", args=[obj.pk])
        return format_html('<a class="button" href="{}">Create customer account →</a>', url)

    def get_urls(self):
        custom = [
            path("<int:pk>/provision/", self.admin_site.admin_view(self.provision_view), name="demo_requests_demorequest_provision"),
        ]
        return custom + super().get_urls()

    def provision_view(self, request, pk):
        if not request.user.is_superuser:
            raise PermissionDenied
        demo = get_object_or_404(DemoRequest, pk=pk)
        back = reverse("admin:demo_requests_demorequest_change", args=[demo.pk])
        if demo.converted_organization_id:
            self.message_user(request, "This booking already has a customer account.", messages.WARNING)
            return redirect(back)
        first, _, last = demo.full_name.strip().partition(" ")
        initial = {
            "organization_name": demo.company_name,
            "plan": Organization.Plan.STARTER,
            "owner_first_name": first,
            "owner_last_name": last,
            "owner_email": demo.work_email,
            "owner_job_title": demo.job_title,
            "modules": [m for m in demo.interested_modules if m not in CORE_MODULES],
            "reason": f"Demo {demo.reference}",
        }
        form = ProvisionCustomerForm(request.POST or None, initial=initial)
        if request.method == "POST" and form.is_valid():
            data = form.cleaned_data
            try:
                result = provision_customer(
                    actor=request.user,
                    organization_name=data["organization_name"],
                    owner_email=data["owner_email"],
                    owner_first_name=data["owner_first_name"],
                    owner_last_name=data["owner_last_name"],
                    owner_job_title=data["owner_job_title"],
                    plan=data["plan"],
                    modules=data["modules"],
                    demo_request=demo,
                )
            except (ApiValidationError, ApiPermissionDenied) as exc:
                form.add_error(None, api_error_text(exc))
            else:
                self.message_user(
                    request,
                    f"Created {result.organization.name}. A set-password invite is on its way to {result.owner.email}.",
                    messages.SUCCESS,
                )
                return redirect("admin:organizations_organization_change", result.organization.pk)
        return TemplateResponse(
            request,
            "admin/organizations/offshora_form.html",
            {
                **self.admin_site.each_context(request),
                "title": f"Create customer account · {demo.company_name}",
                "intro": (
                    "Creates the organization and its owner, switches on the modules below (plus the core set), "
                    "and emails the owner a 7-day link to set their password. Pre-filled from the booking; adjust to what was agreed."
                ),
                "form": form,
                "submit_label": "Create account and send invite",
                "back_url": back,
                "back_label": demo.reference,
            },
        )

    @admin.display(description="Segment", ordering="segment")
    def segment_label(self, obj):
        return catalog.SEGMENTS.get(obj.segment, obj.segment)

    @admin.display(description="Countries")
    def country_list(self, obj):
        return ", ".join(obj.countries)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        # Needed so superusers can run the status actions; every field is read-only.
        return request.user.is_active and request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        # Superusers may erase a prospect's data on request (NDPA data-subject rights).
        return request.user.is_active and request.user.is_superuser


@admin.register(DemoRequestEvent)
class DemoRequestEventAdmin(PlatformStaffOnlyMixin, admin.ModelAdmin):
    list_display = ("demo_request", "from_status", "to_status", "actor", "created_at")
    list_filter = ("to_status", "created_at")
    search_fields = ("demo_request__reference", "demo_request__company_name")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("demo_request", "actor")
    readonly_fields = ("demo_request", "from_status", "to_status", "actor", "reason", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
