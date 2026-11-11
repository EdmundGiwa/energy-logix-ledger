import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q

from .modules import MODULE_CHOICES


class Organization(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"

    class Plan(models.TextChoices):
        MICRO = "micro", "Micro Haulage"
        STARTER = "starter", "Starter"
        GROWTH = "growth", "Growth"
        ENTERPRISE = "enterprise", "Enterprise"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    requested_plan = models.CharField(max_length=20, choices=Plan.choices, default=Plan.STARTER)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class Membership(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Administrator"
        MEMBER = "member", "Member"
        VIEWER = "viewer", "Viewer"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=20, choices=Role.choices)
    job_title = models.CharField(blank=True, max_length=120)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("organization__name", "user__email")
        constraints = [
            models.UniqueConstraint(fields=("organization", "user"), name="unique_organization_membership"),
        ]
        indexes = [
            models.Index(fields=("organization", "is_active"), name="membership_tenant_active_idx"),
            models.Index(fields=("user", "is_active"), name="membership_user_active_idx"),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.organization.name} ({self.get_role_display()})"


class OrganizationModule(models.Model):
    """A module switched on for one organization, beyond the core set every customer gets."""

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="module_entitlements")
    module = models.CharField(max_length=40, choices=MODULE_CHOICES)
    enabled_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("organization__name", "module")
        constraints = [
            models.UniqueConstraint(fields=("organization", "module"), name="unique_organization_module"),
        ]

    def __str__(self):
        return f"{self.organization.name} · {self.get_module_display()}"


class ModuleEntitlementEvent(models.Model):
    """Append-only history of module switches: who changed what, when and why."""

    class Action(models.TextChoices):
        ENABLED = "enabled", "Enabled"
        DISABLED = "disabled", "Disabled"

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="module_events")
    module = models.CharField(max_length=40, choices=MODULE_CHOICES)
    action = models.CharField(max_length=20, choices=Action.choices)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    reason = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at", "-id")
        indexes = [models.Index(fields=("organization", "created_at"), name="module_event_org_time_idx")]

    def __str__(self):
        return f"{self.organization.name}: {self.get_module_display()} {self.action}"


class ModuleAccessRequest(models.Model):
    """A customer asking Offshora to switch on a module they do not have."""

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        APPROVED = "approved", "Approved"
        DECLINED = "declined", "Declined"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="module_requests")
    module = models.CharField(max_length=40, choices=MODULE_CHOICES)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    message = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("organization", "module"),
                condition=Q(status="open"),
                name="unique_open_module_request",
            ),
        ]

    def __str__(self):
        return f"{self.organization.name} wants {self.get_module_display()} ({self.status})"
