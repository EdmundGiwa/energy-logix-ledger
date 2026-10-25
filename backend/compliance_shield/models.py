import uuid
from datetime import date, timedelta
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

from organizations.models import Organization


class RegulatoryCertificate(models.Model):
    class Regulator(models.TextChoices):
        NUPRC = "nuprc", "NUPRC — Nigerian Upstream Petroleum Regulatory Commission"
        NMDPRA = "nmdpra", "NMDPRA — Nigerian Midstream & Downstream Petroleum Regulatory Authority"
        NIMASA = "nimasa", "NIMASA — Nigerian Maritime Administration & Safety Agency"
        CABOTAGE = "cabotage", "NIMASA Cabotage Vessel & Crew Registration"
        FMENV = "fmenv", "Federal Ministry of Environment (FMEnv)"
        NESREA = "nesrea", "NESREA — National Environmental Standards & Regulations"
        NCDMB = "ncdmb", "NCDMB — Nigerian Content Development & Monitoring Board"
        PENCOM = "pencom", "PENCOM — National Pension Commission Certificate"
        ITF = "itf", "Industrial Training Fund (ITF) Compliance"
        NSITF = "nsitf", "Nigeria Social Insurance Trust Fund (NSITF)"
        FIRS = "firs", "FIRS Tax Clearance Certificate (TCC)"
        CAC = "cac", "Corporate Affairs Commission (CAC) Good Standing"

    class Status(models.TextChoices):
        VALID = "valid", "Active & In Compliance"
        EXPIRING_SOON = "expiring_soon", "Expiring Soon (Within 90 Days)"
        EXPIRED = "expired", "Expired — Non-Compliant"
        RENEWAL_IN_PROGRESS = "renewal_in_progress", "Renewal Application Submitted"
        SUSPENDED = "suspended", "Suspended by Regulator"

    class UrgencyTier(models.TextChoices):
        OK = "ok", "Compliant (> 90 Days)"
        UPCOMING_90D = "upcoming_90d", "Upcoming (Within 90 Days)"
        NOTICE_60D = "notice_60d", "Notice (Within 60 Days)"
        WARNING_30D = "warning_30d", "Urgent Warning (Within 30 Days)"
        CRITICAL_7D = "critical_7d", "Critical Expiry (Within 7 Days)"
        EXPIRED = "expired", "Expired — Stop Work Risk"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="regulatory_certificates")
    regulator = models.CharField(max_length=30, choices=Regulator.choices)
    certificate_type = models.CharField(max_length=150)
    certificate_number = models.CharField(max_length=100)
    issuing_authority = models.CharField(max_length=150)
    issue_date = models.DateField()
    expiry_date = models.DateField()
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.VALID)

    # Document & Verification
    document_reference = models.CharField(max_length=200, blank=True)
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="verified_certificates")
    verified_at = models.DateTimeField(null=True, blank=True)
    renewal_tracking_number = models.CharField(max_length=100, blank=True)
    version = models.PositiveIntegerField(default=1)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("expiry_date",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "regulator", "certificate_number"), name="unique_reg_cert_per_org"),
        ]
        indexes = [
            models.Index(fields=("organization", "status"), name="reg_cert_status_idx"),
            models.Index(fields=("organization", "expiry_date"), name="reg_cert_expiry_idx"),
            models.Index(fields=("organization", "regulator"), name="reg_cert_reg_idx"),
        ]

    @property
    def days_to_expiry(self):
        today = date.today()
        exp = self.expiry_date
        if isinstance(exp, str):
            exp = date.fromisoformat(exp)
        return (exp - today).days

    @property
    def urgency_tier(self):
        days = self.days_to_expiry
        if days < 0:
            return self.UrgencyTier.EXPIRED
        elif days <= 7:
            return self.UrgencyTier.CRITICAL_7D
        elif days <= 30:
            return self.UrgencyTier.WARNING_30D
        elif days <= 60:
            return self.UrgencyTier.NOTICE_60D
        elif days <= 90:
            return self.UrgencyTier.UPCOMING_90D
        return self.UrgencyTier.OK

    def calculate_status(self):
        days = self.days_to_expiry
        if self.status == self.Status.SUSPENDED:
            return self.Status.SUSPENDED
        if self.status == self.Status.RENEWAL_IN_PROGRESS:
            return self.Status.RENEWAL_IN_PROGRESS
        if days < 0:
            return self.Status.EXPIRED
        elif days <= 90:
            return self.Status.EXPIRING_SOON
        return self.Status.VALID

    def clean(self):
        if self.issue_date and self.expiry_date and self.issue_date > self.expiry_date:
            raise ValidationError("Issue date cannot be after expiry date.")

    def __str__(self):
        return f"{self.get_regulator_display()}: {self.certificate_number} (Expires: {self.expiry_date})"


class IsoManagementSystemAudit(models.Model):
    class Standard(models.TextChoices):
        ISO_9001 = "iso_9001", "ISO 9001:2015 — Quality Management System"
        ISO_14001 = "iso_14001", "ISO 14001:2015 — Environmental Management System"
        ISO_45001 = "iso_45001", "ISO 45001:2018 — Occupational Health & Safety"
        ISO_27001 = "iso_27001", "ISO 27001:2022 — Information Security Management"
        API_SPEC_Q1 = "api_spec_q1", "API Spec Q1 — Quality Programs for Petroleum & Natural Gas"
        API_SPEC_Q2 = "api_spec_q2", "API Spec Q2 — Quality Programs for Service Supply Organizations"

    class AuditType(models.TextChoices):
        INTERNAL = "internal", "Internal Quality / HSE Audit"
        CERTIFICATION = "certification", "Initial Certification Audit"
        SURVEILLANCE = "surveillance", "Annual Surveillance Audit"
        CLIENT_QUALIFICATION = "client_qualification", "Client (IOC) Pre-qualification Audit"

    class OverallOutcome(models.TextChoices):
        CERTIFIED = "certified", "Certified / Unconditional Recommendation"
        CONDITIONAL_APPROVAL = "conditional", "Approved with Minor Observations"
        MAJOR_FINDINGS = "major_findings", "Major Findings / Action Plan Required"
        WITHDRAWN = "withdrawn", "Non-conformance / Certification Withdrawn"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="iso_audits")
    standard = models.CharField(max_length=30, choices=Standard.choices)
    audit_type = models.CharField(max_length=30, choices=AuditType.choices)
    audit_scope = models.CharField(max_length=200)
    certification_body = models.CharField(max_length=150)
    lead_auditor = models.CharField(max_length=120)
    audit_date = models.DateField()
    next_audit_due = models.DateField()
    overall_outcome = models.CharField(max_length=30, choices=OverallOutcome.choices, default=OverallOutcome.CERTIFIED)
    open_ncrs_count = models.PositiveIntegerField(default=0)
    closed_ncrs_count = models.PositiveIntegerField(default=0)
    certificate_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-audit_date",)
        indexes = [
            models.Index(fields=("organization", "standard"), name="iso_audit_standard_idx"),
            models.Index(fields=("organization", "-audit_date"), name="iso_audit_date_idx"),
        ]

    def __str__(self):
        return f"{self.get_standard_display()} ({self.get_audit_type_display()}) on {self.audit_date}"


class AuditNonConformance(models.Model):
    class Severity(models.TextChoices):
        MINOR = "minor", "Minor Non-Conformance (Observation)"
        MAJOR = "major", "Major Non-Conformance (Systemic Breakdown)"
        OFI = "ofi", "Opportunity for Improvement (OFI)"

    class Status(models.TextChoices):
        OPEN = "open", "Open Finding"
        IN_PROGRESS = "in_progress", "Corrective Action in Progress"
        CLOSED = "closed", "Closed by Lead Auditor"
        VERIFIED = "verified", "Verified in Surveillance Audit"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="audit_ncrs")
    audit = models.ForeignKey(IsoManagementSystemAudit, on_delete=models.CASCADE, related_name="ncrs")
    ncr_number = models.CharField(max_length=40)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.MINOR)
    finding_description = models.TextField()
    root_cause_analysis = models.TextField(blank=True)
    corrective_action_plan = models.TextField(blank=True)
    target_closure_date = models.DateField()
    closed_at = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    assigned_to = models.CharField(max_length=120)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("target_closure_date",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "ncr_number"), name="unique_compliance_ncr_number"),
        ]

    def clean(self):
        if self.audit_id and self.audit.organization_id != self.organization_id:
            raise ValidationError("Audit must belong to the same organization.")

    def __str__(self):
        return f"{self.ncr_number} ({self.get_severity_display()}): {self.status}"


class ComplianceEvidencePack(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft Compilation"
        READY = "ready", "Verified & Sealed"
        SUBMITTED = "submitted", "Submitted to Regulator / Client"
        APPROVED = "approved", "Accepted & Approved"
        ARCHIVED = "archived", "Archived"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="evidence_packs")
    pack_name = models.CharField(max_length=150)
    target_stakeholder = models.CharField(max_length=150)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    dossier_data = models.JSONField(default=dict)
    compiled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="compiled_evidence_packs")
    compiled_at = models.DateTimeField(default=timezone.now)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-compiled_at",)
        indexes = [
            models.Index(fields=("organization", "-compiled_at"), name="compliance_pack_date_idx"),
        ]

    def __str__(self):
        return f"{self.pack_name} for {self.target_stakeholder} ({self.status})"


class ComplianceAuditEvent(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="compliance_audit_events")
    entity_type = models.CharField(max_length=60)
    entity_id = models.CharField(max_length=60)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="compliance_audit_actions")
    action = models.CharField(max_length=60)
    from_status = models.CharField(max_length=30, blank=True)
    to_status = models.CharField(max_length=30, blank=True)
    reason = models.TextField(blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("organization", "-created_at"), name="compliance_audit_idx"),
        ]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Compliance audit records are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Compliance audit records are immutable.")

    def __str__(self):
        return f"{self.action} on {self.entity_type}:{self.entity_id} by {self.actor} at {self.created_at}"
