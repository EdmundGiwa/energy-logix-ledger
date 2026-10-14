import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q

from organizations.models import Organization


class Nomination(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        CONFIRMED = "confirmed", "Confirmed"
        SOUNDING_RECORDED = "sounding_recorded", "Sounding recorded"
        BDN_DRAFT = "bdn_draft", "BDN draft"
        UNDER_REVIEW = "under_review", "Under review"
        APPROVED = "approved", "Approved"
        ISSUED = "issued", "Issued"
        CANCELLED = "cancelled", "Cancelled"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="bunker_nominations")
    reference = models.CharField(max_length=32)
    customer_name = models.CharField(max_length=200)
    vessel_name = models.CharField(max_length=200)
    imo_number = models.CharField(blank=True, max_length=20)
    port = models.CharField(max_length=200)
    product_grade = models.CharField(max_length=120)
    nominated_quantity_mt = models.DecimalField(max_digits=14, decimal_places=3)
    delivery_window_start = models.DateTimeField()
    delivery_window_end = models.DateTimeField()
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.DRAFT)
    version = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_bunker_nominations")
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="updated_bunker_nominations")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "reference"), name="unique_tenant_bunker_nomination_ref"),
            models.CheckConstraint(condition=Q(nominated_quantity_mt__gt=0), name="bunker_nomination_quantity_positive"),
            models.CheckConstraint(condition=Q(delivery_window_end__gt=F("delivery_window_start")), name="bunker_delivery_window_valid"),
        ]
        indexes = [
            models.Index(fields=("organization", "status", "-created_at"), name="bunker_nom_tenant_status_idx"),
            models.Index(fields=("organization", "vessel_name"), name="bunker_nom_tenant_vessel_idx"),
        ]

    def __str__(self):
        return f"{self.reference} - {self.vessel_name}"


class Sounding(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        REVIEWED = "reviewed", "Reviewed"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="bunker_soundings")
    nomination = models.ForeignKey(Nomination, on_delete=models.PROTECT, related_name="soundings")
    tank_reference = models.CharField(max_length=100)
    forward_sounding_m = models.DecimalField(max_digits=8, decimal_places=3)
    aft_sounding_m = models.DecimalField(max_digits=8, decimal_places=3)
    observed_volume_m3 = models.DecimalField(max_digits=14, decimal_places=3)
    observed_temperature_c = models.DecimalField(max_digits=7, decimal_places=3)
    density_kg_m3 = models.DecimalField(max_digits=9, decimal_places=3)
    reviewed_volume_m3 = models.DecimalField(max_digits=14, decimal_places=3)
    reviewed_mass_mt = models.DecimalField(max_digits=14, decimal_places=3)
    calculation_method_note = models.TextField()
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    version = models.PositiveIntegerField(default=1)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="recorded_bunker_soundings")
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True, on_delete=models.PROTECT, related_name="reviewed_bunker_soundings")
    reviewed_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("created_at",)
        constraints = [
            models.UniqueConstraint(fields=("nomination", "tank_reference"), name="unique_nomination_tank_sounding"),
            models.CheckConstraint(condition=Q(forward_sounding_m__gte=0), name="bunker_forward_sounding_nonnegative"),
            models.CheckConstraint(condition=Q(aft_sounding_m__gte=0), name="bunker_aft_sounding_nonnegative"),
            models.CheckConstraint(condition=Q(observed_volume_m3__gt=0), name="bunker_observed_volume_positive"),
            models.CheckConstraint(condition=Q(reviewed_volume_m3__gt=0), name="bunker_reviewed_volume_positive"),
            models.CheckConstraint(condition=Q(reviewed_mass_mt__gt=0), name="bunker_reviewed_mass_positive"),
        ]
        indexes = [models.Index(fields=("organization", "nomination"), name="bunker_snd_tenant_nom_idx")]

    def clean(self):
        if self.nomination_id and self.organization_id != self.nomination.organization_id:
            raise ValidationError("The sounding and nomination must belong to the same organization.")

    def __str__(self):
        return f"{self.nomination.reference} - {self.tank_reference}"


class BunkerDeliveryNote(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        UNDER_REVIEW = "under_review", "Under review"
        APPROVED = "approved", "Approved"
        ISSUED = "issued", "Issued"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="bunker_delivery_notes")
    nomination = models.OneToOneField(Nomination, on_delete=models.PROTECT, related_name="bdn")
    number = models.CharField(max_length=32)
    delivered_quantity_mt = models.DecimalField(max_digits=14, decimal_places=3)
    flashpoint_c = models.DecimalField(max_digits=7, decimal_places=3)
    viscosity_cst = models.DecimalField(max_digits=10, decimal_places=3)
    sulphur_percent = models.DecimalField(max_digits=7, decimal_places=4)
    water_percent = models.DecimalField(max_digits=7, decimal_places=4)
    supplier_acknowledged_by = models.CharField(blank=True, max_length=200)
    supplier_acknowledged_at = models.DateTimeField(blank=True, null=True)
    receiver_acknowledged_by = models.CharField(blank=True, max_length=200)
    receiver_acknowledged_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    version = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_bunker_delivery_notes")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True, on_delete=models.PROTECT, related_name="approved_bunker_delivery_notes")
    approved_at = models.DateTimeField(blank=True, null=True)
    issued_by = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True, on_delete=models.PROTECT, related_name="issued_bunker_delivery_notes")
    issued_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "number"), name="unique_tenant_bdn_number"),
            models.CheckConstraint(condition=Q(delivered_quantity_mt__gt=0), name="bunker_bdn_quantity_positive"),
            models.CheckConstraint(condition=Q(flashpoint_c__gte=0), name="bunker_bdn_flashpoint_nonnegative"),
            models.CheckConstraint(condition=Q(viscosity_cst__gte=0), name="bunker_bdn_viscosity_nonnegative"),
            models.CheckConstraint(condition=Q(sulphur_percent__gte=0), name="bunker_bdn_sulphur_nonnegative"),
            models.CheckConstraint(condition=Q(water_percent__gte=0), name="bunker_bdn_water_nonnegative"),
        ]
        indexes = [models.Index(fields=("organization", "status", "-created_at"), name="bunker_bdn_tenant_status_idx")]

    def clean(self):
        if self.nomination_id and self.organization_id != self.nomination.organization_id:
            raise ValidationError("The BDN and nomination must belong to the same organization.")

    def __str__(self):
        return self.number


class BunkerAuditEvent(models.Model):
    class Outcome(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILURE = "failure", "Failure"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    request_id = models.UUIDField(default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="bunker_audit_events")
    nomination = models.ForeignKey(Nomination, on_delete=models.PROTECT, related_name="audit_events")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="bunker_audit_events")
    action = models.CharField(max_length=60)
    outcome = models.CharField(max_length=16, choices=Outcome.choices, default=Outcome.SUCCESS)
    reason = models.TextField(blank=True)
    from_status = models.CharField(blank=True, max_length=24)
    to_status = models.CharField(blank=True, max_length=24)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=("organization", "nomination", "-created_at"), name="bunker_audit_tenant_nom_idx")]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Audit events are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Audit events are immutable.")

    def __str__(self):
        return f"{self.nomination.reference}: {self.action}"
