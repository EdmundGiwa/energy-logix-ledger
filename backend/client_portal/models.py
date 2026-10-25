import hashlib
import json
import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from organizations.models import Organization


class ClientPortalProfile(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="client_profiles")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="client_portal_profiles")
    client_name = models.CharField(max_length=150)
    client_customer_code = models.CharField(max_length=60, blank=True)
    allowed_modules = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("client_name",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "user"), name="unique_client_profile_per_org_user"),
        ]
        indexes = [
            models.Index(fields=("organization", "client_name"), name="client_prof_name_idx"),
            models.Index(fields=("organization", "is_active"), name="client_prof_active_idx"),
        ]

    def __str__(self):
        return f"{self.user} - {self.client_name} ({self.organization.name})"


class SharedDeliverablePackage(models.Model):
    class DeliverableType(models.TextChoices):
        BUNKER_BDN = "bunker_bdn", "Certified Bunker Delivery Note (BDN)"
        HAULAGE_POD = "haulage_pod", "Proof of Delivery (POD) & e-Waybill"
        HYDROTEST_DOSSIER = "hydrotest_dossier", "Pipeline Hydrotest Zero-Drop Dossier"
        INSPECTION_REPORT = "inspection_report", "Asset Integrity & NDT Survey Report"
        COMPLIANCE_EVIDENCE = "compliance_evidence", "Statutory & ISO Compliance Dossier"
        COMMERCIAL_INVOICE = "commercial_invoice", "Issued Commercial Invoice & Statement"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="shared_deliverables")
    client_name = models.CharField(max_length=150)
    title = models.CharField(max_length=200)
    deliverable_type = models.CharField(max_length=50, choices=DeliverableType.choices)
    source_reference = models.CharField(max_length=100)
    summary_metadata = models.JSONField(default=dict)
    verification_seal = models.CharField(max_length=128, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="shared_packages")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("organization", "client_name"), name="shared_deliv_client_idx"),
            models.Index(fields=("organization", "deliverable_type"), name="shared_deliv_type_idx"),
        ]

    def generate_seal(self):
        payload = f"{self.organization_id}:{self.client_name}:{self.deliverable_type}:{self.source_reference}:{json.dumps(self.summary_metadata, sort_keys=True)}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def save(self, *args, **kwargs):
        if not self.verification_seal:
            self.verification_seal = self.generate_seal()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.source_reference}) for {self.client_name}"


class ClientPortalAccessLog(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="client_access_logs")
    client_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="client_portal_accesses")
    client_name = models.CharField(max_length=150)
    action = models.CharField(max_length=60)
    resource_type = models.CharField(max_length=60)
    resource_reference = models.CharField(max_length=100)
    ip_address = models.CharField(max_length=45, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict)
    accessed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-accessed_at",)
        indexes = [
            models.Index(fields=("organization", "-accessed_at"), name="client_access_time_idx"),
            models.Index(fields=("organization", "client_name"), name="client_access_org_idx"),
        ]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Client portal access logs are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Client portal access logs are immutable.")

    def __str__(self):
        return f"{self.action} on {self.resource_type}:{self.resource_reference} by {self.client_name} at {self.accessed_at}"
