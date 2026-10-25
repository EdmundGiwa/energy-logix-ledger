import uuid
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q
from django.utils import timezone

from organizations.models import Organization


class TankFieldJob(models.Model):
    class ScopeOfWork(models.TextChoices):
        EVACUATION_CLEANING = "evac_cleaning", "Sludge Evacuation & Tank Cleaning"
        BLASTING_COATING = "blast_coat", "Abrasive Blasting & Internal Recoating"
        FULL_REFURBISHMENT = "full_refurb", "Complete Tank Overhaul (Cleaning, Blasting, Recoating)"
        INSPECTION_REPAIR = "inspect_repair", "API 653 Out-of-Service Inspection & Floor Repair"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft Scope & Estimate"
        PERMIT_PENDING = "permit_pending", "Permit & Safety Interlock Pending"
        ACTIVE = "active", "In Progress (Field Operations)"
        INSPECTION = "inspection", "QA/QC Inspection & Testing"
        COMPLETED = "completed", "Completed & Demobilized"
        CANCELLED = "cancelled", "Cancelled"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="tank_jobs")
    job_number = models.CharField(max_length=40)
    client_name = models.CharField(max_length=150)
    terminal_or_facility = models.CharField(max_length=150)
    tank_identifier = models.CharField(max_length=80)
    tank_capacity_m3 = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    scope_of_work = models.CharField(max_length=30, choices=ScopeOfWork.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    
    # SafePass Confined-Space Interlock
    safepass_permit_ref = models.CharField(max_length=60, blank=True)
    gas_test_cleared = models.BooleanField(default=False)
    
    # Financial Costing
    estimated_cost_minor = models.BigIntegerField(default=0)
    actual_cost_minor = models.BigIntegerField(default=0)
    currency = models.CharField(max_length=3, default="NGN")
    version = models.PositiveIntegerField(default=1)

    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_tank_jobs")
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="updated_tank_jobs")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "job_number"), name="unique_tank_job_number"),
            models.CheckConstraint(condition=Q(estimated_cost_minor__gte=0), name="tank_job_est_cost_nonnegative"),
            models.CheckConstraint(condition=Q(actual_cost_minor__gte=0), name="tank_job_act_cost_nonnegative"),
        ]
        indexes = [
            models.Index(fields=("organization", "status", "-created_at"), name="tank_job_status_idx"),
            models.Index(fields=("organization", "tank_identifier"), name="tank_job_ident_idx"),
        ]

    def __str__(self):
        return f"{self.job_number} - {self.tank_identifier} ({self.get_status_display()})"


class SludgeWasteManifest(models.Model):
    class WasteClassification(models.TextChoices):
        HYDROCARBON_SLUDGE = "hydrocarbon_sludge", "Tank Bottom Heavy Hydrocarbon Sludge"
        CONTAMINATED_WATER = "contaminated_water", "Oily Wash Water / Effluent"
        SPENT_GRIT = "spent_grit", "Spent Copper Slag / Blasting Grit"
        RUST_SCALE = "rust_scale", "Corrosion Scale & Solids"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="waste_manifests")
    job = models.ForeignKey(TankFieldJob, on_delete=models.PROTECT, related_name="waste_manifests")
    manifest_number = models.CharField(max_length=40)
    waste_classification = models.CharField(max_length=30, choices=WasteClassification.choices)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_of_measure = models.CharField(max_length=20, default="metric_tonnes")
    transporter_name = models.CharField(max_length=150)
    vehicle_registration = models.CharField(max_length=40)
    driver_name = models.CharField(max_length=120)
    nesrea_permit_number = models.CharField(max_length=80, blank=True)
    disposal_facility = models.CharField(max_length=150)
    treatment_method = models.CharField(max_length=120, default="Thermal Desorption & Bioremediation")
    is_consignment_signed = models.BooleanField(default=False)
    dispatched_at = models.DateTimeField(default=timezone.now)
    disposed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-dispatched_at",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "manifest_number"), name="unique_sludge_manifest_number"),
            models.CheckConstraint(condition=Q(quantity__gt=0), name="sludge_qty_positive"),
        ]
        indexes = [
            models.Index(fields=("organization", "waste_classification"), name="sludge_class_idx"),
        ]

    def clean(self):
        if self.job_id and self.organization_id != self.job.organization_id:
            raise ValidationError("The waste manifest and job must belong to the same organization.")

    def __str__(self):
        return f"{self.manifest_number} - {self.get_waste_classification_display()} ({self.quantity} {self.unit_of_measure})"


class CoatingInspection(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="tank_coating_inspections")
    job = models.ForeignKey(TankFieldJob, on_delete=models.PROTECT, related_name="coating_inspections")
    surface_location = models.CharField(max_length=120)
    blast_standard = models.CharField(max_length=80, default="SSPC-SP 10 / NACE No. 2 (Near-White Metal)")
    surface_profile_microns = models.DecimalField(max_digits=6, decimal_places=2)
    coating_system = models.CharField(max_length=150)
    specified_dft_microns = models.PositiveIntegerField()
    measured_min_dft_microns = models.PositiveIntegerField()
    measured_avg_dft_microns = models.PositiveIntegerField()
    measured_max_dft_microns = models.PositiveIntegerField()
    dft_passed = models.BooleanField(default=True)
    adhesion_test_method = models.CharField(max_length=80, default="ASTM D4541 Dolly Pull-off")
    adhesion_result_mpa = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    ambient_temp_c = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    steel_temp_c = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    relative_humidity_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    dew_point_c = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    inspector_name = models.CharField(max_length=120)
    nace_level = models.CharField(max_length=60, default="NACE / AMPP Level 2 Certified")
    inspection_date = models.DateField(default=timezone.now)
    passed = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-inspection_date",)
        indexes = [
            models.Index(fields=("organization", "passed"), name="coating_insp_pass_idx"),
        ]

    def clean(self):
        if self.job_id and self.organization_id != self.job.organization_id:
            raise ValidationError("The inspection and job must belong to the same organization.")
        if self.measured_min_dft_microns > self.measured_max_dft_microns:
            raise ValidationError("Minimum DFT cannot exceed maximum DFT.")

    def __str__(self):
        return f"{self.job.job_number} @ {self.surface_location}: {self.measured_avg_dft_microns}µm ({'PASSED' if self.passed else 'FAILED'})"


class CrewEquipmentUtilization(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="tank_utilization_logs")
    job = models.ForeignKey(TankFieldJob, on_delete=models.PROTECT, related_name="utilization_logs")
    entry_date = models.DateField()
    personnel_role = models.CharField(max_length=80)
    headcount = models.PositiveIntegerField(default=1)
    man_hours = models.DecimalField(max_digits=8, decimal_places=2)
    equipment_description = models.CharField(max_length=150)
    equipment_hours = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    consumables_used = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-entry_date",)
        constraints = [
            models.CheckConstraint(condition=Q(man_hours__gte=0), name="tank_man_hours_nonnegative"),
            models.CheckConstraint(condition=Q(equipment_hours__gte=0), name="tank_equip_hours_nonnegative"),
        ]

    def clean(self):
        if self.job_id and self.organization_id != self.job.organization_id:
            raise ValidationError("The utilization log and job must belong to the same organization.")

    def __str__(self):
        return f"{self.job.job_number} ({self.entry_date}): {self.personnel_role} x {self.headcount} ({self.man_hours} hrs)"


class TankWorksAuditEvent(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="tank_audit_events")
    job = models.ForeignKey(TankFieldJob, on_delete=models.PROTECT, related_name="audit_events")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="tank_audit_actions")
    action = models.CharField(max_length=60)
    from_status = models.CharField(max_length=30, blank=True)
    to_status = models.CharField(max_length=30, blank=True)
    reason = models.TextField(blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("organization", "-created_at"), name="tank_audit_idx"),
        ]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("TankWorks audit records are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("TankWorks audit records are immutable.")

    def __str__(self):
        return f"{self.action} on {self.job.job_number} by {self.actor} at {self.created_at}"
