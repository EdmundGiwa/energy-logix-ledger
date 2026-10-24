import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q

from organizations.models import Organization


class PipelineAsset(models.Model):
    class FluidType(models.TextChoices):
        LIQUID = "liquid", "Liquid"
        GAS = "gas", "Gas"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="pipeline_assets")
    reference = models.CharField(max_length=40)
    name = models.CharField(max_length=200)
    fluid_type = models.CharField(max_length=12, choices=FluidType.choices)
    governing_code = models.CharField(max_length=40)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)
        constraints = [models.UniqueConstraint(fields=("organization", "reference"), name="unique_pipeline_asset_reference")]
        indexes = [models.Index(fields=("organization", "is_active", "name"), name="pipeline_asset_tenant_idx")]

    def __str__(self):
        return f"{self.reference} - {self.name}"


class PigRun(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        LAUNCHED = "launched", "Launched"
        IN_TRANSIT = "in_transit", "In transit"
        ARRIVED = "arrived", "Arrived"
        RECOVERED = "recovered", "Recovered"
        CANCELLED = "cancelled", "Cancelled"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="pipeline_pig_runs")
    asset = models.ForeignKey(PipelineAsset, on_delete=models.PROTECT, related_name="pig_runs")
    reference = models.CharField(max_length=40)
    pig_type = models.CharField(max_length=80)
    launcher_kp = models.DecimalField(max_digits=12, decimal_places=3)
    receiver_kp = models.DecimalField(max_digits=12, decimal_places=3)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    launched_at = models.DateTimeField(blank=True, null=True)
    arrived_at = models.DateTimeField(blank=True, null=True)
    recovered_at = models.DateTimeField(blank=True, null=True)
    transit_velocity_mps = models.DecimalField(max_digits=8, decimal_places=3, blank=True, null=True)
    debris_volume_m3 = models.DecimalField(max_digits=12, decimal_places=3, blank=True, null=True)
    notes = models.TextField(blank=True)
    version = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_pipeline_pig_runs")
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="updated_pipeline_pig_runs")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "reference"), name="unique_pipeline_pig_reference"),
            models.CheckConstraint(condition=Q(receiver_kp__gte=F("launcher_kp")), name="pipeline_pig_route_forward"),
            models.CheckConstraint(condition=Q(transit_velocity_mps__isnull=True) | Q(transit_velocity_mps__gte=0), name="pipeline_pig_velocity_nonnegative"),
            models.CheckConstraint(condition=Q(debris_volume_m3__isnull=True) | Q(debris_volume_m3__gte=0), name="pipeline_pig_debris_nonnegative"),
        ]
        indexes = [models.Index(fields=("organization", "status", "-updated_at"), name="pipeline_pig_status_idx")]

    def clean(self):
        if self.asset_id and self.organization_id != self.asset.organization_id:
            raise ValidationError("The pig run and asset must belong to the same organization.")

    def __str__(self):
        return self.reference


class Hydrotest(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        IN_PROGRESS = "in_progress", "In progress"
        PASSED = "passed", "Passed"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="pipeline_hydrotests")
    asset = models.ForeignKey(PipelineAsset, on_delete=models.PROTECT, related_name="hydrotests")
    reference = models.CharField(max_length=40)
    test_pressure_bar = models.DecimalField(max_digits=10, decimal_places=3)
    hold_duration_minutes = models.PositiveIntegerField()
    pressure_drop_bar = models.DecimalField(max_digits=10, decimal_places=3, blank=True, null=True)
    minimum_temperature_c = models.DecimalField(max_digits=7, decimal_places=3, blank=True, null=True)
    maximum_temperature_c = models.DecimalField(max_digits=7, decimal_places=3, blank=True, null=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    started_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    acceptance_note = models.TextField(blank=True)
    version = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_pipeline_hydrotests")
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="updated_pipeline_hydrotests")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "reference"), name="unique_pipeline_hydrotest_reference"),
            models.CheckConstraint(condition=Q(test_pressure_bar__gt=0), name="pipeline_hydrotest_pressure_positive"),
            models.CheckConstraint(condition=Q(hold_duration_minutes__gt=0), name="pipeline_hydrotest_hold_positive"),
            models.CheckConstraint(condition=Q(pressure_drop_bar__isnull=True) | Q(pressure_drop_bar__gte=0), name="pipeline_hydrotest_drop_nonnegative"),
        ]
        indexes = [models.Index(fields=("organization", "status", "-updated_at"), name="pipeline_hydro_status_idx")]

    def clean(self):
        if self.asset_id and self.organization_id != self.asset.organization_id:
            raise ValidationError("The hydrotest and asset must belong to the same organization.")

    def __str__(self):
        return self.reference


class InspectionRecord(models.Model):
    class InspectionType(models.TextChoices):
        UT = "ut", "Ultrasonic thickness"
        RT = "rt", "Radiography"
        MPI = "mpi", "Magnetic particle"
        PT = "pt", "Dye penetrant"
        VISUAL = "visual", "Visual"

    class Result(models.TextChoices):
        ACCEPTED = "accepted", "Accepted"
        REQUIRES_REVIEW = "requires_review", "Requires review"
        REJECTED = "rejected", "Rejected"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="pipeline_inspections")
    asset = models.ForeignKey(PipelineAsset, on_delete=models.PROTECT, related_name="inspections")
    reference = models.CharField(max_length=40)
    inspection_type = models.CharField(max_length=12, choices=InspectionType.choices)
    subject_reference = models.CharField(max_length=120)
    nominal_wall_thickness_mm = models.DecimalField(max_digits=8, decimal_places=3, blank=True, null=True)
    measured_wall_thickness_mm = models.DecimalField(max_digits=8, decimal_places=3, blank=True, null=True)
    corrosion_rate_mm_per_year = models.DecimalField(max_digits=8, decimal_places=4, blank=True, null=True)
    remaining_life_years = models.DecimalField(max_digits=10, decimal_places=3, blank=True, null=True)
    result = models.CharField(max_length=20, choices=Result.choices, default=Result.REQUIRES_REVIEW)
    inspected_at = models.DateTimeField()
    inspector_name = models.CharField(max_length=200)
    evidence_reference = models.CharField(max_length=240, blank=True)
    notes = models.TextField(blank=True)
    version = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_pipeline_inspections")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-inspected_at",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "reference"), name="unique_pipeline_inspection_reference"),
            models.CheckConstraint(condition=Q(nominal_wall_thickness_mm__isnull=True) | Q(nominal_wall_thickness_mm__gt=0), name="pipeline_inspection_nominal_positive"),
            models.CheckConstraint(condition=Q(measured_wall_thickness_mm__isnull=True) | Q(measured_wall_thickness_mm__gt=0), name="pipeline_inspection_measured_positive"),
            models.CheckConstraint(condition=Q(corrosion_rate_mm_per_year__isnull=True) | Q(corrosion_rate_mm_per_year__gte=0), name="pipeline_inspection_rate_nonnegative"),
            models.CheckConstraint(condition=Q(remaining_life_years__isnull=True) | Q(remaining_life_years__gte=0), name="pipeline_inspection_life_nonnegative"),
        ]
        indexes = [models.Index(fields=("organization", "asset", "-inspected_at"), name="pipeline_inspection_idx")]

    def clean(self):
        if self.asset_id and self.organization_id != self.asset.organization_id:
            raise ValidationError("The inspection and asset must belong to the same organization.")

    def __str__(self):
        return self.reference


class CPSurveyPoint(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="pipeline_cp_points")
    asset = models.ForeignKey(PipelineAsset, on_delete=models.PROTECT, related_name="cp_survey_points")
    reference = models.CharField(max_length=40)
    kp = models.DecimalField(max_digits=12, decimal_places=3)
    potential_mv = models.DecimalField(max_digits=10, decimal_places=3)
    electrode = models.CharField(max_length=80, default="CSE")
    surveyed_at = models.DateTimeField()
    surveyor_name = models.CharField(max_length=200)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_pipeline_cp_points")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-surveyed_at", "kp")
        constraints = [models.UniqueConstraint(fields=("organization", "reference"), name="unique_pipeline_cp_reference")]
        indexes = [models.Index(fields=("organization", "asset", "-surveyed_at"), name="pipeline_cp_survey_idx")]

    def clean(self):
        if self.asset_id and self.organization_id != self.asset.organization_id:
            raise ValidationError("The CP survey point and asset must belong to the same organization.")

    def __str__(self):
        return self.reference


class ROWObservation(models.Model):
    class Severity(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_REVIEW = "in_review", "In review"
        CLOSED = "closed", "Closed"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="pipeline_row_observations")
    asset = models.ForeignKey(PipelineAsset, on_delete=models.PROTECT, related_name="row_observations")
    reference = models.CharField(max_length=40)
    kp = models.DecimalField(max_digits=12, decimal_places=3)
    category = models.CharField(max_length=120)
    severity = models.CharField(max_length=12, choices=Severity.choices)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.OPEN)
    observed_at = models.DateTimeField()
    observer_name = models.CharField(max_length=200)
    description = models.TextField()
    evidence_reference = models.CharField(max_length=240, blank=True)
    resolved_at = models.DateTimeField(blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_pipeline_row_observations")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-observed_at",)
        constraints = [models.UniqueConstraint(fields=("organization", "reference"), name="unique_pipeline_row_reference")]
        indexes = [models.Index(fields=("organization", "status", "-observed_at"), name="pipeline_row_status_idx")]

    def clean(self):
        if self.asset_id and self.organization_id != self.asset.organization_id:
            raise ValidationError("The ROW observation and asset must belong to the same organization.")

    def __str__(self):
        return self.reference


class PipelineAuditEvent(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="pipeline_audit_events")
    asset = models.ForeignKey(PipelineAsset, on_delete=models.PROTECT, related_name="audit_events", blank=True, null=True)
    pig_run = models.ForeignKey(PigRun, on_delete=models.PROTECT, related_name="audit_events", blank=True, null=True)
    hydrotest = models.ForeignKey(Hydrotest, on_delete=models.PROTECT, related_name="audit_events", blank=True, null=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="pipeline_audit_events")
    action = models.CharField(max_length=50)
    from_status = models.CharField(blank=True, max_length=20)
    to_status = models.CharField(blank=True, max_length=20)
    reason = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=("organization", "-created_at"), name="pipeline_audit_tenant_idx")]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Pipeline audit events are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Pipeline audit events are immutable.")
