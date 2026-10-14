import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q

from organizations.models import Organization


class TenantRecord(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Customer(TenantRecord):
    name = models.CharField(max_length=200)
    contact_name = models.CharField(blank=True, max_length=200)
    contact_phone = models.CharField(blank=True, max_length=40)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("name",)
        constraints = [models.UniqueConstraint(fields=("organization", "name"), name="unique_tenant_haul_customer")]

    def __str__(self):
        return self.name


class DeliveryLocation(TenantRecord):
    name = models.CharField(max_length=200)
    address = models.TextField(blank=True)
    contact_name = models.CharField(blank=True, max_length=200)
    contact_phone = models.CharField(blank=True, max_length=40)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("name",)
        constraints = [models.UniqueConstraint(fields=("organization", "name"), name="unique_tenant_delivery_location")]

    def __str__(self):
        return self.name


class Truck(TenantRecord):
    registration_number = models.CharField(max_length=32)
    fleet_number = models.CharField(blank=True, max_length=50)
    make_model = models.CharField(blank=True, max_length=120)
    capacity_litres = models.DecimalField(max_digits=14, decimal_places=3)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("registration_number",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "registration_number"), name="unique_tenant_truck_registration"),
            models.CheckConstraint(condition=Q(capacity_litres__gt=0), name="haul_truck_capacity_positive"),
        ]

    def __str__(self):
        return self.registration_number


class Trailer(TenantRecord):
    registration_number = models.CharField(max_length=32)
    fleet_number = models.CharField(blank=True, max_length=50)
    capacity_litres = models.DecimalField(max_digits=14, decimal_places=3)
    calibration_expires_on = models.DateField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("registration_number",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "registration_number"), name="unique_tenant_trailer_registration"),
            models.CheckConstraint(condition=Q(capacity_litres__gt=0), name="haul_trailer_capacity_positive"),
        ]

    def __str__(self):
        return self.registration_number


class Driver(TenantRecord):
    full_name = models.CharField(max_length=200)
    phone_number = models.CharField(max_length=40)
    licence_number = models.CharField(max_length=80)
    licence_expires_on = models.DateField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("full_name",)
        constraints = [models.UniqueConstraint(fields=("organization", "licence_number"), name="unique_tenant_driver_licence")]

    def __str__(self):
        return self.full_name


class Fleet(TenantRecord):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        READY = "ready", "Ready"

    reference = models.CharField(max_length=32)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    customer = models.ForeignKey(Customer, blank=True, null=True, on_delete=models.PROTECT, related_name="fleets")
    origin = models.ForeignKey(DeliveryLocation, blank=True, null=True, on_delete=models.PROTECT, related_name="origin_fleets")
    destination = models.ForeignKey(DeliveryLocation, blank=True, null=True, on_delete=models.PROTECT, related_name="destination_fleets")
    truck = models.ForeignKey(Truck, blank=True, null=True, on_delete=models.PROTECT, related_name="fleets")
    trailer = models.ForeignKey(Trailer, blank=True, null=True, on_delete=models.PROTECT, related_name="fleets")
    driver = models.ForeignKey(Driver, blank=True, null=True, on_delete=models.PROTECT, related_name="fleets")
    version = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_haul_fleets")
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="updated_haul_fleets")

    class Meta:
        ordering = ("-updated_at",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "reference"), name="unique_tenant_fleet_reference"),
            models.CheckConstraint(
                condition=Q(origin__isnull=True) | Q(destination__isnull=True) | ~Q(origin=F("destination")),
                name="haul_fleet_route_distinct",
            ),
        ]
        indexes = [models.Index(fields=("organization", "status", "-updated_at"), name="haul_fleet_tenant_status_idx")]

    @property
    def completed_steps(self):
        return sum((
            bool(self.customer_id),
            bool(self.origin_id and self.destination_id),
            bool(self.truck_id),
            bool(self.trailer_id),
            bool(self.driver_id),
        ))

    @property
    def next_step(self):
        if not self.customer_id:
            return "customer"
        if not self.origin_id or not self.destination_id:
            return "route"
        if not self.truck_id:
            return "truck"
        if not self.trailer_id:
            return "trailer"
        if not self.driver_id:
            return "driver"
        return "complete"

    def clean(self):
        for field in ("customer", "origin", "destination", "truck", "trailer", "driver"):
            value = getattr(self, field, None)
            if value and value.organization_id != self.organization_id:
                raise ValidationError({field: "The selected record belongs to another organization."})

    def __str__(self):
        return self.reference


class FleetAuditEvent(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="fleet_audit_events")
    fleet = models.ForeignKey(Fleet, on_delete=models.PROTECT, related_name="audit_events")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="fleet_audit_events")
    action = models.CharField(max_length=40)
    stage = models.CharField(blank=True, max_length=20)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=("organization", "fleet", "-created_at"), name="haul_fleet_audit_idx")]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Fleet audit events are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Fleet audit events are immutable.")


class Dispatch(TenantRecord):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        DISPATCHED = "dispatched", "Dispatched"
        IN_TRANSIT = "in_transit", "In transit"
        ARRIVED = "arrived", "Arrived"
        DISCHARGING = "discharging", "Discharging"
        DELIVERED = "delivered", "Delivered"
        CLOSED = "closed", "Closed"
        CANCELLED = "cancelled", "Cancelled"

    reference = models.CharField(max_length=32)
    fleet = models.ForeignKey(Fleet, blank=True, null=True, on_delete=models.PROTECT, related_name="dispatches")
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="dispatches")
    origin = models.ForeignKey(DeliveryLocation, on_delete=models.PROTECT, related_name="origin_dispatches")
    destination = models.ForeignKey(DeliveryLocation, on_delete=models.PROTECT, related_name="destination_dispatches")
    truck = models.ForeignKey(Truck, on_delete=models.PROTECT, related_name="dispatches")
    trailer = models.ForeignKey(Trailer, on_delete=models.PROTECT, related_name="dispatches")
    driver = models.ForeignKey(Driver, on_delete=models.PROTECT, related_name="dispatches")
    product = models.CharField(max_length=120)
    planned_quantity_litres = models.DecimalField(max_digits=14, decimal_places=3)
    scheduled_departure_at = models.DateTimeField()
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    version = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_haul_dispatches")
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="updated_haul_dispatches")

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "reference"), name="unique_tenant_dispatch_reference"),
            models.CheckConstraint(condition=Q(planned_quantity_litres__gt=0), name="haul_dispatch_quantity_positive"),
            models.CheckConstraint(condition=~Q(origin=F("destination")), name="haul_dispatch_route_distinct"),
        ]
        indexes = [
            models.Index(fields=("organization", "status", "-created_at"), name="haul_disp_tenant_status_idx"),
            models.Index(fields=("organization", "scheduled_departure_at"), name="haul_disp_tenant_depart_idx"),
        ]

    def clean(self):
        for field in ("fleet", "customer", "origin", "destination", "truck", "trailer", "driver"):
            value = getattr(self, field, None)
            if value and value.organization_id != self.organization_id:
                raise ValidationError({field: "The selected record belongs to another organization."})

    def __str__(self):
        return self.reference


class WeighbridgeReading(TenantRecord):
    class Kind(models.TextChoices):
        TARE = "tare", "Tare"
        GROSS = "gross", "Gross"

    class Source(models.TextChoices):
        MANUAL = "manual", "Manual entry"
        INTEGRATION = "integration", "External integration"

    dispatch = models.ForeignKey(Dispatch, on_delete=models.PROTECT, related_name="weighbridge_readings")
    kind = models.CharField(max_length=12, choices=Kind.choices)
    weight_kg = models.DecimalField(max_digits=14, decimal_places=3)
    captured_at = models.DateTimeField()
    weighbridge_name = models.CharField(max_length=200)
    ticket_number = models.CharField(blank=True, max_length=80)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.MANUAL)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="haul_weighbridge_readings")

    class Meta:
        ordering = ("captured_at",)
        constraints = [
            models.UniqueConstraint(fields=("dispatch", "kind"), name="unique_dispatch_weighbridge_kind"),
            models.CheckConstraint(condition=Q(weight_kg__gt=0), name="haul_weighbridge_weight_positive"),
        ]

    def clean(self):
        if self.dispatch_id and self.dispatch.organization_id != self.organization_id:
            raise ValidationError("The reading and dispatch must belong to the same organization.")

    def __str__(self):
        return f"{self.dispatch.reference} {self.kind}"


class ElectronicWaybill(TenantRecord):
    dispatch = models.OneToOneField(Dispatch, on_delete=models.PROTECT, related_name="waybill")
    number = models.CharField(max_length=40)
    verification_code = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    issued_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="issued_haul_waybills")
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-issued_at",)
        constraints = [models.UniqueConstraint(fields=("organization", "number"), name="unique_tenant_waybill_number")]

    def clean(self):
        if self.dispatch_id and self.dispatch.organization_id != self.organization_id:
            raise ValidationError("The waybill and dispatch must belong to the same organization.")

    def __str__(self):
        return self.number


class ProofOfDelivery(TenantRecord):
    dispatch = models.OneToOneField(Dispatch, on_delete=models.PROTECT, related_name="proof_of_delivery")
    delivered_quantity_litres = models.DecimalField(max_digits=14, decimal_places=3)
    ullage_mm = models.DecimalField(max_digits=10, decimal_places=3)
    observed_temperature_c = models.DecimalField(max_digits=7, decimal_places=3)
    water_paste_result = models.CharField(max_length=20, choices=(("clear", "Clear"), ("water_detected", "Water detected")))
    receiver_name = models.CharField(max_length=200)
    receiver_title = models.CharField(max_length=120)
    receiver_acknowledged_at = models.DateTimeField()
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="recorded_haul_pods")

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.CheckConstraint(condition=Q(delivered_quantity_litres__gt=0), name="haul_pod_quantity_positive"),
            models.CheckConstraint(condition=Q(ullage_mm__gte=0), name="haul_pod_ullage_nonnegative"),
        ]

    def clean(self):
        if self.dispatch_id and self.dispatch.organization_id != self.organization_id:
            raise ValidationError("The proof of delivery and dispatch must belong to the same organization.")

    def __str__(self):
        return f"POD {self.dispatch.reference}"


class HaulageAuditEvent(models.Model):
    class Outcome(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILURE = "failure", "Failure"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    request_id = models.UUIDField(default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="haulage_audit_events")
    dispatch = models.ForeignKey(Dispatch, on_delete=models.PROTECT, related_name="audit_events")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="haulage_audit_events")
    action = models.CharField(max_length=60)
    outcome = models.CharField(max_length=16, choices=Outcome.choices, default=Outcome.SUCCESS)
    reason = models.TextField(blank=True)
    from_status = models.CharField(blank=True, max_length=20)
    to_status = models.CharField(blank=True, max_length=20)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=("organization", "dispatch", "-created_at"), name="haul_audit_tenant_disp_idx")]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Audit events are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Audit events are immutable.")

    def __str__(self):
        return f"{self.dispatch.reference}: {self.action}"
