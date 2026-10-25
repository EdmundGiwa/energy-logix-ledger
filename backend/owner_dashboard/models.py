import uuid
from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from organizations.models import Organization


class Currency(models.TextChoices):
    NGN = "NGN", "Nigerian Naira (₦)"
    USD = "USD", "US Dollar ($)"


class ExecutiveKpiSnapshot(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="executive_kpi_snapshots")
    as_of_date = models.DateField(default=timezone.now)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.USD)

    gross_billed_minor = models.BigIntegerField(default=0)
    collected_minor = models.BigIntegerField(default=0)
    outstanding_receivables_minor = models.BigIntegerField(default=0)
    ipc_retention_held_minor = models.BigIntegerField(default=0)

    product_delivered_tonnage = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    avg_shrinkage_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    avg_turnaround_hours = models.DecimalField(max_digits=5, decimal_places=1, default=Decimal("0.0"))
    reconciliation_rate_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("100.00"))

    active_field_jobs_count = models.PositiveIntegerField(default=0)
    critical_risk_items_count = models.PositiveIntegerField(default=0)
    warning_risk_items_count = models.PositiveIntegerField(default=0)

    module_breakdown = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-as_of_date", "-created_at")
        indexes = [
            models.Index(fields=("organization", "-as_of_date"), name="exec_kpi_asof_idx"),
            models.Index(fields=("organization", "currency"), name="exec_kpi_curr_idx"),
        ]

    def __str__(self):
        return f"{self.organization.name} KPI Snapshot {self.as_of_date} ({self.currency})"


class ExecutiveExceptionAlert(models.Model):
    class Severity(models.TextChoices):
        CRITICAL = "crit", "Critical Risk / Stop-Work"
        WARNING = "warn", "Operational Warning"
        INFO = "info", "Advisory Notice"

    class ModuleSource(models.TextChoices):
        REFINERY_LINK = "refinery_link", "RefineryLink"
        SAFE_PASS = "safe_pass", "SafePass (HSE)"
        BUNKERFLOW = "bunkerflow", "BunkerFlow"
        HAUL_TRAC = "haul_trac", "HaulTrac"
        PIPE_INTEGRITY = "pipe_integrity", "PipeIntegrity"
        COMPLIANCE_SHIELD = "compliance_shield", "Compliance Shield"
        BILLING = "billing", "Billing & Commercial"
        TANK_WORKS = "tank_works", "TankWorks"
        MARINE_STORES = "marine_stores", "MarineStores"
        EPC_LINK = "epc_link", "EPC-Link"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="executive_exceptions")
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.WARNING)
    module = models.CharField(max_length=30, choices=ModuleSource.choices)
    title = models.CharField(max_length=200)
    description = models.TextField()
    source_record_type = models.CharField(max_length=100)
    source_record_id = models.CharField(max_length=100)
    source_url = models.CharField(max_length=255, blank=True)
    variance_percent = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)

    is_acknowledged = models.BooleanField(default=False)
    acknowledged_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="acknowledged_exceptions")
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("organization", "severity"), name="exec_exc_sev_idx"),
            models.Index(fields=("organization", "is_acknowledged"), name="exec_exc_ack_idx"),
            models.Index(fields=("organization", "-created_at"), name="exec_exc_time_idx"),
        ]

    def __str__(self):
        return f"[{self.severity.upper()}] {self.title} ({self.organization.name})"


class ExecutiveExportJob(models.Model):
    class ReportType(models.TextChoices):
        EXECUTIVE_BRIEF = "executive_brief", "Executive Board Operations Brief"
        VARIANCE_LEDGER = "variance_ledger", "Cross-Module Shrinkage & Variance Ledger"
        STATUTORY_COMPLIANCE = "statutory_compliance", "Statutory & Regulatory Audit Pack"
        OPERATIONAL_KPI = "operational_kpi", "Turnaround & Asset Utilization Rollup"

    class JobStatus(models.TextChoices):
        QUEUED = "queued", "Queued"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    class FileFormat(models.TextChoices):
        PDF = "pdf", "Adobe PDF Document"
        CSV = "csv", "Comma-Separated Values (CSV)"
        XLSX = "xlsx", "Microsoft Excel Spreadsheet"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="executive_exports")
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="requested_exports")
    report_type = models.CharField(max_length=40, choices=ReportType.choices)
    filters = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=JobStatus.choices, default=JobStatus.QUEUED)
    file_format = models.CharField(max_length=10, choices=FileFormat.choices, default=FileFormat.PDF)
    file_size_bytes = models.PositiveIntegerField(default=0)
    download_checksum = models.CharField(max_length=128, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("organization", "status"), name="exec_exp_status_idx"),
            models.Index(fields=("organization", "-created_at"), name="exec_exp_time_idx"),
        ]

    def __str__(self):
        return f"{self.report_type} ({self.status}) for {self.organization.name}"
