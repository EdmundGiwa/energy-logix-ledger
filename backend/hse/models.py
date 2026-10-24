import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from organizations.models import Organization


class TenantRecord(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Worker(TenantRecord):
    employee_number = models.CharField(max_length=50)
    full_name = models.CharField(max_length=200)
    job_title = models.CharField(max_length=120)
    email = models.EmailField(blank=True)
    phone_number = models.CharField(blank=True, max_length=40)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("full_name",)
        constraints = [models.UniqueConstraint(fields=("organization", "employee_number"), name="unique_tenant_worker_number")]

    def __str__(self):
        return f"{self.employee_number} - {self.full_name}"


class Credential(TenantRecord):
    class Kind(models.TextChoices):
        BOSIET = "bosiet", "BOSIET"
        HUET = "huet", "HUET"
        OSP = "osp", "Offshore Safety Permit"
        STCW = "stcw", "STCW"
        MEDICAL = "medical", "Medical fitness"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending verification"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"
        REVOKED = "revoked", "Revoked"

    worker = models.ForeignKey(Worker, on_delete=models.PROTECT, related_name="credentials")
    kind = models.CharField(max_length=20, choices=Kind.choices)
    certificate_number = models.CharField(max_length=100)
    issuer = models.CharField(max_length=200)
    valid_from = models.DateField()
    expires_on = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    evidence_reference = models.CharField(blank=True, max_length=255, help_text="Document-vault reference; not a public URL.")
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True, on_delete=models.PROTECT, related_name="verified_hse_credentials")
    verified_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ("expires_on",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "kind", "certificate_number"), name="unique_tenant_credential_number"),
            models.CheckConstraint(condition=Q(expires_on__gte=models.F("valid_from")), name="hse_credential_dates_valid"),
        ]

    def clean(self):
        if self.worker_id and self.worker.organization_id != self.organization_id:
            raise ValidationError({"worker": "The worker belongs to another organization."})


class SafetyProcedure(TenantRecord):
    name = models.CharField(max_length=200)
    site = models.CharField(max_length=200)
    credential_buffer_days = models.PositiveSmallIntegerField(default=30)
    oxygen_min_percent = models.DecimalField(max_digits=5, decimal_places=2)
    oxygen_max_percent = models.DecimalField(max_digits=5, decimal_places=2)
    max_lel_percent = models.DecimalField(max_digits=5, decimal_places=2)
    max_h2s_ppm = models.DecimalField(max_digits=8, decimal_places=2)
    required_credential_kinds = models.JSONField(default=list)
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True, on_delete=models.PROTECT, related_name="approved_hse_procedures")
    approved_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("organization", "name"), name="unique_tenant_safety_procedure"),
            models.CheckConstraint(condition=Q(oxygen_max_percent__gt=models.F("oxygen_min_percent")), name="hse_oxygen_range_valid"),
        ]

    def __str__(self):
        return f"{self.name} ({self.site})"


class Mobilization(TenantRecord):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        READY = "ready", "Ready"
        BLOCKED = "blocked", "Blocked"
        RELEASED = "released", "Released"
        CANCELLED = "cancelled", "Cancelled"

    reference = models.CharField(max_length=40)
    destination = models.CharField(max_length=200)
    scheduled_at = models.DateTimeField()
    procedure = models.ForeignKey(SafetyProcedure, on_delete=models.PROTECT, related_name="mobilizations")
    workers = models.ManyToManyField(Worker, through="MobilizationWorker", related_name="mobilizations")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    version = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_mobilizations")

    class Meta:
        ordering = ("-created_at",)
        constraints = [models.UniqueConstraint(fields=("organization", "reference"), name="unique_tenant_mobilization_reference")]


class MobilizationWorker(models.Model):
    mobilization = models.ForeignKey(Mobilization, on_delete=models.PROTECT, related_name="crew_entries")
    worker = models.ForeignKey(Worker, on_delete=models.PROTECT, related_name="mobilization_entries")
    is_cleared = models.BooleanField(default=False)
    blocking_reasons = models.JSONField(default=list)
    checked_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("mobilization", "worker"), name="unique_mobilization_worker")]


class Permit(TenantRecord):
    class Kind(models.TextChoices):
        HOT_WORK = "hot_work", "Hot work"
        CONFINED_SPACE = "confined_space", "Confined space"
        HEIGHT = "working_at_height", "Working at height"
        EXCAVATION = "excavation", "Excavation"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        UNDER_REVIEW = "under_review", "Under review"
        APPROVED = "approved", "Approved"
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        CLOSED = "closed", "Closed"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"

    reference = models.CharField(max_length=40)
    kind = models.CharField(max_length=30, choices=Kind.choices)
    title = models.CharField(max_length=240)
    site = models.CharField(max_length=200)
    work_description = models.TextField()
    procedure = models.ForeignKey(SafetyProcedure, on_delete=models.PROTECT, related_name="permits")
    performing_authority = models.ForeignKey(Worker, on_delete=models.PROTECT, related_name="performing_permits")
    starts_at = models.DateTimeField()
    expires_at = models.DateTimeField()
    hazards = models.JSONField(default=list)
    controls = models.JSONField(default=list)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    version = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_hse_permits")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True, on_delete=models.PROTECT, related_name="approved_hse_permits")
    approved_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "reference"), name="unique_tenant_permit_reference"),
            models.CheckConstraint(condition=Q(expires_at__gt=models.F("starts_at")), name="hse_permit_window_valid"),
        ]


class GasTest(TenantRecord):
    permit = models.ForeignKey(Permit, on_delete=models.PROTECT, related_name="gas_tests")
    tested_at = models.DateTimeField()
    oxygen_percent = models.DecimalField(max_digits=5, decimal_places=2)
    lel_percent = models.DecimalField(max_digits=5, decimal_places=2)
    h2s_ppm = models.DecimalField(max_digits=8, decimal_places=2)
    instrument_reference = models.CharField(max_length=120)
    instrument_calibration_expires_on = models.DateField()
    passed = models.BooleanField(editable=False)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="hse_gas_tests")

    class Meta:
        ordering = ("tested_at",)
        constraints = [
            models.CheckConstraint(condition=Q(oxygen_percent__gte=0) & Q(lel_percent__gte=0) & Q(h2s_ppm__gte=0), name="hse_gas_values_nonnegative"),
        ]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Gas-test readings are immutable.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Gas-test readings are immutable.")


class SafetyAcknowledgement(TenantRecord):
    class Kind(models.TextChoices):
        JSA = "jsa", "Job Safety Analysis"
        TOOLBOX = "toolbox", "Toolbox talk"

    permit = models.ForeignKey(Permit, on_delete=models.PROTECT, related_name="acknowledgements")
    worker = models.ForeignKey(Worker, on_delete=models.PROTECT, related_name="safety_acknowledgements")
    kind = models.CharField(max_length=20, choices=Kind.choices)
    acknowledged_at = models.DateTimeField()
    statement = models.TextField()

    class Meta:
        constraints = [models.UniqueConstraint(fields=("permit", "worker", "kind"), name="unique_permit_worker_ack")]


class HseAuditEvent(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="hse_audit_events")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="hse_audit_events")
    target_type = models.CharField(max_length=40)
    target_id = models.UUIDField()
    action = models.CharField(max_length=50)
    reason = models.TextField(blank=True)
    from_status = models.CharField(blank=True, max_length=30)
    to_status = models.CharField(blank=True, max_length=30)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=("organization", "target_type", "target_id", "-created_at"), name="hse_audit_target_idx")]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("HSE audit events are immutable.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("HSE audit events are immutable.")
