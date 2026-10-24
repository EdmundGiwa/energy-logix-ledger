import uuid
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from organizations.models import Organization


class Terminal(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="refinery_terminals")
    code = models.CharField(max_length=40)
    name = models.CharField(max_length=200)
    location = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "code"), name="unique_terminal_code"),
        ]
        indexes = [
            models.Index(fields=("organization", "is_active", "code"), name="refinery_terminal_idx"),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


class DepotTank(models.Model):
    class ProductType(models.TextChoices):
        PMS = "pms", "Premium Motor Spirit (PMS)"
        AGO = "ago", "Automotive Gas Oil (AGO)"
        DPK = "dpk", "Dual Purpose Kerosene (DPK)"
        ATK = "atk", "Aviation Turbine Kerosene (ATK)"

    class Status(models.TextChoices):
        RECEIVING = "receiving", "Receiving"
        SETTLING = "settling", "Settling"
        DISPENSING = "dispensing", "Dispensing"
        IDLE = "idle", "Idle"
        MAINTENANCE = "maintenance", "Maintenance"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="refinery_tanks")
    terminal = models.ForeignKey(Terminal, on_delete=models.PROTECT, related_name="tanks")
    tank_number = models.CharField(max_length=40)
    product_type = models.CharField(max_length=12, choices=ProductType.choices)
    nominal_capacity_litres = models.DecimalField(max_digits=14, decimal_places=2)
    safe_fill_level_mm = models.PositiveIntegerField()
    current_status = models.CharField(max_length=20, choices=Status.choices, default=Status.DISPENSING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("terminal", "tank_number")
        constraints = [
            models.UniqueConstraint(fields=("organization", "terminal", "tank_number"), name="unique_depot_tank"),
            models.CheckConstraint(condition=Q(nominal_capacity_litres__gt=0), name="depot_tank_capacity_positive"),
            models.CheckConstraint(condition=Q(safe_fill_level_mm__gt=0), name="depot_tank_fill_level_positive"),
        ]
        indexes = [
            models.Index(fields=("organization", "terminal", "product_type"), name="refinery_tank_idx"),
        ]

    def clean(self):
        if self.terminal_id and self.organization_id != self.terminal.organization_id:
            raise ValidationError("The tank and terminal must belong to the same organization.")

    def __str__(self):
        return f"{self.terminal.code} - {self.tank_number} ({self.get_product_type_display()})"


class OfftakeAppointment(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        CHECKED_IN = "checked_in", "Checked In (Holding Park)"
        CALLED_UP = "called_up", "Called Up (Gantry Entry)"
        LOADING = "loading", "Loading"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="refinery_appointments")
    terminal = models.ForeignKey(Terminal, on_delete=models.PROTECT, related_name="appointments")
    reference = models.CharField(max_length=40)
    truck_plate = models.CharField(max_length=30)
    driver_name = models.CharField(max_length=200)
    driver_phone = models.CharField(max_length=40, blank=True)
    driver_license = models.CharField(max_length=60, blank=True)
    product_type = models.CharField(max_length=12, choices=DepotTank.ProductType.choices)
    nominated_volume_litres = models.DecimalField(max_digits=12, decimal_places=2)
    holding_park_slot = models.CharField(max_length=40, blank=True)
    rfid_tag = models.CharField(max_length=60, blank=True)
    e_callup_reference = models.CharField(max_length=60, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    scheduled_at = models.DateTimeField()
    checked_in_at = models.DateTimeField(blank=True, null=True)
    called_up_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    version = models.PositiveIntegerField(default=1)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_refinery_appointments")
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="updated_refinery_appointments")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-scheduled_at",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "reference"), name="unique_offtake_appointment_ref"),
            models.CheckConstraint(condition=Q(nominated_volume_litres__gt=0), name="offtake_nominated_volume_positive"),
        ]
        indexes = [
            models.Index(fields=("organization", "status", "-scheduled_at"), name="refinery_appt_status_idx"),
        ]

    def clean(self):
        if self.terminal_id and self.organization_id != self.terminal.organization_id:
            raise ValidationError("The appointment and terminal must belong to the same organization.")

    def __str__(self):
        return f"{self.reference} ({self.truck_plate})"


class TankGaugeDip(models.Model):
    class DipType(models.TextChoices):
        MANUAL = "manual", "Manual Ullage Dip"
        AUTOMATED = "automated", "Automated Tank Gauge (ATG)"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="refinery_tank_dips")
    tank = models.ForeignKey(DepotTank, on_delete=models.PROTECT, related_name="gauge_dips")
    reference = models.CharField(max_length=40)
    dip_type = models.CharField(max_length=12, choices=DipType.choices, default=DipType.MANUAL)
    observed_level_mm = models.DecimalField(max_digits=10, decimal_places=2)
    water_cut_mm = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    temperature_c = models.DecimalField(max_digits=6, decimal_places=2)
    observed_density_kg_m3 = models.DecimalField(max_digits=7, decimal_places=2)
    gross_observed_volume_litres = models.DecimalField(max_digits=14, decimal_places=2)
    net_standard_volume_litres = models.DecimalField(max_digits=14, decimal_places=2)
    recorded_at = models.DateTimeField()
    operator_name = models.CharField(max_length=200)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="recorded_refinery_dips")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-recorded_at",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "reference"), name="unique_tank_gauge_dip_ref"),
            models.CheckConstraint(condition=Q(observed_level_mm__gte=0), name="tank_dip_level_nonnegative"),
            models.CheckConstraint(condition=Q(water_cut_mm__gte=0), name="tank_dip_water_nonnegative"),
            models.CheckConstraint(condition=Q(gross_observed_volume_litres__gte=0), name="tank_dip_gov_nonnegative"),
            models.CheckConstraint(condition=Q(net_standard_volume_litres__gte=0), name="tank_dip_nsv_nonnegative"),
        ]
        indexes = [
            models.Index(fields=("organization", "tank", "-recorded_at"), name="refinery_dip_idx"),
        ]

    def clean(self):
        if self.tank_id and self.organization_id != self.tank.organization_id:
            raise ValidationError("The tank dip and depot tank must belong to the same organization.")

    def __str__(self):
        return f"{self.reference} ({self.tank.tank_number})"


class GantryMeterTicket(models.Model):
    class Status(models.TextChoices):
        ISSUED = "issued", "Issued"
        RECONCILED = "reconciled", "Reconciled"
        FLAGGED_VARIANCE = "flagged_variance", "Flagged Variance"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="refinery_meter_tickets")
    appointment = models.ForeignKey(OfftakeAppointment, on_delete=models.PROTECT, related_name="meter_tickets")
    tank = models.ForeignKey(DepotTank, on_delete=models.PROTECT, related_name="meter_tickets")
    ticket_number = models.CharField(max_length=40)
    meter_id = models.CharField(max_length=60)
    batch_start_reading = models.DecimalField(max_digits=14, decimal_places=2)
    batch_end_reading = models.DecimalField(max_digits=14, decimal_places=2)
    gross_volume_litres = models.DecimalField(max_digits=12, decimal_places=2)
    net_volume_litres = models.DecimalField(max_digits=12, decimal_places=2)
    temperature_c = models.DecimalField(max_digits=6, decimal_places=2)
    density_at_15c = models.DecimalField(max_digits=7, decimal_places=2)
    variance_litres = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    variance_percent = models.DecimalField(max_digits=6, decimal_places=3, default=Decimal("0.000"))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ISSUED)
    started_at = models.DateTimeField()
    completed_at = models.DateTimeField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_meter_tickets")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-completed_at",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "ticket_number"), name="unique_gantry_meter_ticket"),
            models.CheckConstraint(condition=Q(gross_volume_litres__gt=0), name="gantry_gross_volume_positive"),
            models.CheckConstraint(condition=Q(net_volume_litres__gt=0), name="gantry_net_volume_positive"),
            models.CheckConstraint(condition=Q(batch_end_reading__gte=models.F("batch_start_reading")), name="gantry_meter_reading_forward"),
        ]
        indexes = [
            models.Index(fields=("organization", "status", "-completed_at"), name="refinery_ticket_status_idx"),
        ]

    def clean(self):
        if self.appointment_id and self.organization_id != self.appointment.organization_id:
            raise ValidationError("The meter ticket and appointment must belong to the same organization.")
        if self.tank_id and self.organization_id != self.tank.organization_id:
            raise ValidationError("The meter ticket and depot tank must belong to the same organization.")

    def __str__(self):
        return f"{self.ticket_number} ({self.meter_id})"


class BatchQualityCertificate(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="refinery_quality_certs")
    certificate_number = models.CharField(max_length=40)
    product_type = models.CharField(max_length=12, choices=DepotTank.ProductType.choices)
    batch_number = models.CharField(max_length=60)
    density_at_15c = models.DecimalField(max_digits=7, decimal_places=2)
    flash_point_c = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    ron = models.DecimalField(max_digits=5, decimal_places=1, blank=True, null=True)
    distillation_recovery_percent = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    sulphur_ppm = models.DecimalField(max_digits=8, decimal_places=2)
    is_compliant_nmdpra = models.BooleanField(default=True)
    laboratory_name = models.CharField(max_length=200)
    tested_at = models.DateTimeField()
    authorized_chemist = models.CharField(max_length=200)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_quality_certs")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-tested_at",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "certificate_number"), name="unique_refinery_qc_number"),
            models.CheckConstraint(condition=Q(density_at_15c__gt=0), name="qc_density_positive"),
            models.CheckConstraint(condition=Q(sulphur_ppm__gte=0), name="qc_sulphur_nonnegative"),
        ]
        indexes = [
            models.Index(fields=("organization", "product_type", "-tested_at"), name="refinery_qc_idx"),
        ]

    def __str__(self):
        return f"{self.certificate_number} - Batch {self.batch_number}"


class RefineryAuditEvent(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="refinery_audit_events")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="refinery_audit_events")
    action = models.CharField(max_length=50)
    target_type = models.CharField(max_length=40)
    target_id = models.UUIDField()
    from_status = models.CharField(max_length=30, blank=True)
    to_status = models.CharField(max_length=30, blank=True)
    reason = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("organization", "-created_at"), name="refinery_audit_tenant_idx"),
        ]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Refinery audit events are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Refinery audit events are immutable.")
