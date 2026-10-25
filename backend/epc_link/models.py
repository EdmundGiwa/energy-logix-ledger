import uuid
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

from organizations.models import Organization


class ApprovedVendor(models.Model):
    class Category(models.TextChoices):
        TUBULARS = "tubulars", "Line Pipes, Tubing & Casing"
        VALVES = "valves", "Valves, Actuators & Manifolds"
        STRUCTURAL = "structural", "Structural Beams, Plates & Girders"
        FITTINGS_FLANGES = "fittings_flanges", "Forged Flanges & Butt-Weld Fittings"
        SERVICES = "services", "Inspection, NDT & Coating Services"

    class Status(models.TextChoices):
        ACTIVE = "active", "Qualified & Active"
        PROBATION = "probation", "Conditional / Probationary"
        BLACKLISTED = "blacklisted", "Suspended / Disqualified"

    class AuditRating(models.TextChoices):
        GRADE_A = "A", "Grade A (High Capability / Low Risk)"
        GRADE_B = "B", "Grade B (Approved with Minor Observations)"
        GRADE_C = "C", "Grade C (Audited / Conditional Approval)"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="epc_vendors")
    vendor_code = models.CharField(max_length=40)
    vendor_name = models.CharField(max_length=150)
    category = models.CharField(max_length=30, choices=Category.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    audit_rating = models.CharField(max_length=5, choices=AuditRating.choices, default=AuditRating.GRADE_A)

    # Compliance Credentials
    nogic_jqs_id = models.CharField(max_length=60, blank=True)
    nuprc_permit_ref = models.CharField(max_length=60, blank=True)
    iso_certification = models.CharField(max_length=80, default="ISO 9001:2015 Certified")
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=40, blank=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("vendor_name",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "vendor_code"), name="unique_epc_vendor_code"),
        ]
        indexes = [
            models.Index(fields=("organization", "status"), name="epc_vendor_status_idx"),
            models.Index(fields=("organization", "category"), name="epc_vendor_cat_idx"),
        ]

    def __str__(self):
        return f"{self.vendor_code} - {self.vendor_name} ({self.get_status_display()})"


class MaterialRequisition(models.Model):
    class Priority(models.TextChoices):
        ROUTINE = "routine", "Routine (Standard Lead Time)"
        URGENT = "urgent", "Urgent (Expedited Fabrication)"
        EMERGENCY = "emergency", "Shutdown / Emergency Breakdown"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft Specification"
        SUBMITTED = "submitted", "Submitted for Technical Review"
        APPROVED = "approved", "Approved for Yard Issuance / Procurement"
        REJECTED = "rejected", "Rejected / Revision Required"
        FULFILLED = "fulfilled", "Fully Issued / Fulfilled"
        CANCELLED = "cancelled", "Cancelled"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="material_requisitions")
    requisition_number = models.CharField(max_length=40)
    project_name = models.CharField(max_length=150)
    client_name = models.CharField(max_length=150)
    wbs_code = models.CharField(max_length=60, blank=True)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.ROUTINE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    required_date = models.DateField()
    delivery_location = models.CharField(max_length=150)
    estimated_cost_minor = models.BigIntegerField(default=0)
    currency = models.CharField(max_length=3, default="NGN")
    version = models.PositiveIntegerField(default=1)

    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="requested_requisitions")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="approved_requisitions")
    approved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "requisition_number"), name="unique_epc_requisition_number"),
            models.CheckConstraint(condition=Q(estimated_cost_minor__gte=0), name="epc_req_cost_nonnegative"),
        ]
        indexes = [
            models.Index(fields=("organization", "status", "-created_at"), name="epc_req_status_idx"),
            models.Index(fields=("organization", "wbs_code"), name="epc_req_wbs_idx"),
        ]

    def __str__(self):
        return f"{self.requisition_number} - {self.project_name} ({self.get_status_display()})"


class PipeYardItem(models.Model):
    class MaterialType(models.TextChoices):
        LINE_PIPE = "line_pipe", "Carbon & Alloy Steel Line Pipe"
        CASING_TUBING = "casing_tubing", "OCTG Casing & Production Tubing"
        STRUCTURAL = "structural", "Structural Beams, Angles & Tubulars"
        FLANGES_FITTINGS = "flanges_fittings", "Flanges, Tees, Reducers & Elbows"
        VALVES = "valves", "Ball, Gate, Globe & Check Valves"
        CONSUMABLES = "consumables", "Welding Electrodes, Gaskets & Fasteners"

    class Status(models.TextChoices):
        AVAILABLE = "available", "Available in Yard"
        RESERVED = "reserved", "Reserved for Requisition"
        ISSUED = "issued", "Issued to Project / Site"
        QUARANTINE = "quarantine", "Quarantine (NCR / MTC Pending)"

    class MtcType(models.TextChoices):
        EN_10204_3_1 = "en_10204_3_1", "EN 10204 3.1 Inspection Certificate"
        EN_10204_3_2 = "en_10204_3_2", "EN 10204 3.2 Third-Party Witnessed Certificate"
        STANDARD_MILL = "standard_mill", "Standard Mill Test Report (MTR)"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="pipe_yard_items")
    item_tag = models.CharField(max_length=60)
    material_type = models.CharField(max_length=30, choices=MaterialType.choices)
    grade_specification = models.CharField(max_length=80)  # e.g. API 5L X65 PSL2, ASTM A106 Gr. B
    outer_diameter_inches = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)
    wall_thickness_mm = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    schedule = models.CharField(max_length=30, blank=True)  # e.g. SCH 40, SCH 80, SCH 160
    length_meters = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("12.00"))
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1.00"))
    unit_of_measure = models.CharField(max_length=20, default="joints")

    # MTC & Metallurgy Traceability
    heat_number = models.CharField(max_length=60)
    mill_manufacturer = models.CharField(max_length=150)
    mtc_number = models.CharField(max_length=80)
    mtc_type = models.CharField(max_length=30, choices=MtcType.choices, default=MtcType.EN_10204_3_1)
    yield_strength_mpa = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    tensile_strength_mpa = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    impact_test_joules = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    # Yard Location & Tracking
    yard_location = models.CharField(max_length=120)  # e.g. Onne Port Yard, PH Trans-Amadi Base
    bay_rack_position = models.CharField(max_length=60)  # e.g. Bay 4 - Rack B - Row 2
    qr_tag = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)

    # Linkages & Nigerian Content
    vendor = models.ForeignKey(ApprovedVendor, on_delete=models.PROTECT, null=True, blank=True, related_name="supplied_yard_items")
    reservation = models.ForeignKey(MaterialRequisition, on_delete=models.SET_NULL, null=True, blank=True, related_name="reserved_items")
    unit_cost_minor = models.BigIntegerField(default=0)
    currency = models.CharField(max_length=3, default="NGN")
    nigerian_content_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("100.00"))

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "item_tag"), name="unique_epc_item_tag"),
            models.CheckConstraint(condition=Q(quantity__gte=0), name="epc_item_qty_nonnegative"),
            models.CheckConstraint(condition=Q(unit_cost_minor__gte=0), name="epc_item_cost_nonnegative"),
            models.CheckConstraint(
                condition=Q(nigerian_content_percent__gte=0) & Q(nigerian_content_percent__lte=100),
                name="epc_nc_percent_range",
            ),
        ]
        indexes = [
            models.Index(fields=("organization", "status"), name="epc_item_status_idx"),
            models.Index(fields=("organization", "heat_number"), name="epc_item_heat_idx"),
            models.Index(fields=("organization", "material_type"), name="epc_item_mat_type_idx"),
        ]

    def clean(self):
        if self.vendor_id and self.vendor.organization_id != self.organization_id:
            raise ValidationError("Vendor must belong to the same organization.")
        if self.reservation_id and self.reservation.organization_id != self.organization_id:
            raise ValidationError("Material requisition reservation must belong to the same organization.")

    def __str__(self):
        return f"{self.item_tag} ({self.grade_specification}) - Heat: {self.heat_number} [{self.get_status_display()}]"


class MaterialIssueSlip(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="issue_slips")
    issue_slip_number = models.CharField(max_length=40)
    requisition = models.ForeignKey(MaterialRequisition, on_delete=models.PROTECT, related_name="issue_slips")
    issued_to = models.CharField(max_length=150)
    contractor_name = models.CharField(max_length=150)
    issued_date = models.DateField(default=timezone.now)
    receiver_signature_ref = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    issued_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="issued_slips")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "issue_slip_number"), name="unique_epc_issue_slip_number"),
        ]
        indexes = [
            models.Index(fields=("organization", "-issued_date"), name="epc_issue_slip_date_idx"),
        ]

    def clean(self):
        if self.requisition_id and self.requisition.organization_id != self.organization_id:
            raise ValidationError("Requisition must belong to the same organization.")

    def __str__(self):
        return f"{self.issue_slip_number} - Req: {self.requisition.requisition_number} to {self.contractor_name}"


class MaterialIssueSlipItem(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="issue_slip_items")
    issue_slip = models.ForeignKey(MaterialIssueSlip, on_delete=models.CASCADE, related_name="items")
    yard_item = models.ForeignKey(PipeYardItem, on_delete=models.PROTECT, related_name="issuance_records")
    quantity_issued = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(quantity_issued__gt=0), name="epc_slip_item_qty_positive"),
        ]

    def clean(self):
        if self.issue_slip_id and self.issue_slip.organization_id != self.organization_id:
            raise ValidationError("Issue slip must belong to the same organization.")
        if self.yard_item_id and self.yard_item.organization_id != self.organization_id:
            raise ValidationError("Yard item must belong to the same organization.")

    def __str__(self):
        return f"{self.issue_slip.issue_slip_number}: {self.quantity_issued} of {self.yard_item.item_tag}"


class EpcLinkAuditEvent(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="epc_audit_events")
    entity_type = models.CharField(max_length=60)
    entity_id = models.CharField(max_length=60)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="epc_audit_actions")
    action = models.CharField(max_length=60)
    from_status = models.CharField(max_length=30, blank=True)
    to_status = models.CharField(max_length=30, blank=True)
    reason = models.TextField(blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("organization", "-created_at"), name="epc_audit_idx"),
        ]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("EPC-Link audit records are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("EPC-Link audit records are immutable.")

    def __str__(self):
        return f"{self.action} on {self.entity_type}:{self.entity_id} by {self.actor} at {self.created_at}"
