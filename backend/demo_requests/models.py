import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q


class DemoRequest(models.Model):
    """A prospect's request for a tailored product demo.

    Platform-level sales record, not tenant-owned: the prospect has no organization
    yet. Only platform superusers can see these records (see ``admin.py``).
    """

    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        CONFIRMED = "confirmed", "Confirmed"
        COMPLETED = "completed", "Completed"
        NO_SHOW = "no_show", "No-show"
        CANCELLED = "cancelled", "Cancelled"

    # Statuses that hold a calendar slot.
    ACTIVE_STATUSES = (Status.REQUESTED, Status.CONFIRMED)

    class CompanySize(models.TextChoices):
        SIZE_1_25 = "1_25", "1–25 staff"
        SIZE_26_100 = "26_100", "26–100 staff"
        SIZE_101_300 = "101_300", "101–300 staff"
        SIZE_301_1000 = "301_1000", "301–1,000 staff"
        SIZE_1000_PLUS = "1000_plus", "1,000+ staff"

    class CurrentTools(models.TextChoices):
        PAPER_EXCEL = "paper_excel", "Paper & Excel"
        WHATSAPP_EMAIL = "whatsapp_email", "WhatsApp & email"
        ERP = "erp", "ERP (SAP, Sage, Odoo…)"
        INDUSTRY_SOFTWARE = "industry_software", "Industry-specific software"
        MIXED = "mixed", "A mix of the above"

    class MeetingFormat(models.TextChoices):
        GOOGLE_MEET = "google_meet", "Google Meet"
        ZOOM = "zoom", "Zoom"
        TEAMS = "teams", "Microsoft Teams"
        PHONE = "phone", "Phone call"
        WHATSAPP = "whatsapp", "WhatsApp call"
        ON_SITE = "on_site", "On-site visit"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    reference = models.CharField(max_length=16, unique=True, editable=False)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED)

    # Qualification
    segment = models.CharField(max_length=40)
    operations = models.JSONField(default=list, blank=True)
    company_name = models.CharField(max_length=200)
    company_website = models.URLField(max_length=300, blank=True)
    company_size = models.CharField(max_length=20, choices=CompanySize.choices)
    countries = models.JSONField(default=list)
    pain_points = models.JSONField(default=list, blank=True)
    interested_modules = models.JSONField(default=list)
    current_tools = models.CharField(max_length=30, choices=CurrentTools.choices)

    # Contact (personal data: keep minimal; never log)
    full_name = models.CharField(max_length=150)
    work_email = models.EmailField(max_length=254)
    phone = models.CharField(max_length=32)
    job_title = models.CharField(max_length=120)
    notes = models.TextField(max_length=2000, blank=True)

    # Scheduling (stored in UTC)
    scheduled_start = models.DateTimeField()
    duration_minutes = models.PositiveSmallIntegerField()
    prospect_timezone = models.CharField(max_length=64)
    meeting_format = models.CharField(max_length=20, choices=MeetingFormat.choices)
    on_site_location = models.CharField(max_length=120, blank=True)

    consent_to_contact = models.BooleanField()

    # Set when Offshora staff turn this booking into a customer account.
    converted_organization = models.ForeignKey(
        "organizations.Organization", null=True, blank=True, on_delete=models.SET_NULL, related_name="source_demo_requests"
    )
    converted_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("scheduled_start",)
        indexes = [
            models.Index(fields=["status", "scheduled_start"]),
            models.Index(fields=["work_email"]),
            models.Index(fields=["created_at"]),
        ]
        constraints = [
            # One demo per slot: a requested or confirmed booking holds the slot.
            models.UniqueConstraint(
                fields=["scheduled_start"],
                condition=Q(status__in=["requested", "confirmed"]),
                name="demo_request_unique_active_slot",
            ),
            models.CheckConstraint(condition=Q(consent_to_contact=True), name="demo_request_consent_required"),
            models.CheckConstraint(condition=Q(duration_minutes__gt=0), name="demo_request_duration_positive"),
        ]

    def __str__(self):
        return f"{self.reference} · {self.company_name}"


class DemoRequestEvent(models.Model):
    """Append-only status history for a demo request."""

    demo_request = models.ForeignKey(DemoRequest, on_delete=models.CASCADE, related_name="events")
    from_status = models.CharField(max_length=20, blank=True)
    to_status = models.CharField(max_length=20)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        help_text="Empty when the prospect created the request through the public form.",
    )
    reason = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at", "id")

    def __str__(self):
        return f"{self.demo_request.reference}: {self.from_status or '—'} → {self.to_status}"
