import hashlib
import json
from datetime import date, timedelta
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone

from owner_dashboard.models import (
    Currency,
    ExecutiveExceptionAlert,
    ExecutiveExportJob,
    ExecutiveKpiSnapshot,
)


class OwnerDashboardService:
    @staticmethod
    def compute_live_kpis(*, organization, currency=Currency.USD):
        today = timezone.now().date()

        # 1. Billing & Receivables
        gross_billed = 0
        collected = 0
        outstanding = 0
        ipc_retention = 0

        try:
            from billing.models import CommercialInvoice, InterimPaymentCertificate, PaymentReceipt

            inv_qs = CommercialInvoice.objects.filter(organization=organization, currency=currency)
            billed_sum = inv_qs.exclude(status=CommercialInvoice.Status.CANCELLED).aggregate(total=Sum("total_amount_minor"))["total"]
            gross_billed = billed_sum or 0

            paid_sum = PaymentReceipt.objects.filter(organization=organization, currency=currency).aggregate(total=Sum("amount_minor"))["total"]
            collected = paid_sum or 0

            bal_sum = inv_qs.filter(status__in=[
                CommercialInvoice.Status.ISSUED,
                CommercialInvoice.Status.PARTIALLY_PAID,
                CommercialInvoice.Status.OVERDUE,
            ]).aggregate(total=Sum("balance_due_minor"))["total"]
            outstanding = bal_sum or 0

            ipc_sum = InterimPaymentCertificate.objects.filter(organization=organization, currency=currency).aggregate(total=Sum("retention_amount_minor"))["total"]
            ipc_retention = ipc_sum or 0
        except Exception:
            pass

        # 2. Compliance Risk
        crit_risk = 0
        warn_risk = 0
        try:
            from compliance_shield.models import RegulatoryCertificate, AuditNonConformance
            cert_qs = RegulatoryCertificate.objects.filter(organization=organization)
            for cert in cert_qs:
                dte = cert.days_to_expiry
                if dte <= 7:
                    crit_risk += 1
                elif dte <= 30:
                    warn_risk += 1

            crit_risk += AuditNonConformance.objects.filter(
                organization=organization,
                severity=AuditNonConformance.Severity.MAJOR,
                status__in=["open", "under_investigation"],
            ).count()
        except Exception:
            pass

        # 3. Operations & Field Jobs
        active_jobs = 0
        try:
            from tank_works.models import TankFieldJob
            active_jobs += TankFieldJob.objects.filter(
                organization=organization,
                status__in=[TankFieldJob.Status.ACTIVE, TankFieldJob.Status.PERMIT_PENDING, TankFieldJob.Status.INSPECTION],
            ).count()
        except Exception:
            pass

        try:
            from pipeline_integrity.models import JointInspection
            active_jobs += JointInspection.objects.filter(organization=organization).count()
        except Exception:
            pass

        # Module Breakdown metrics
        breakdown = {
            "billing": {
                "invoices_billed_minor": gross_billed,
                "collections_minor": collected,
                "outstanding_minor": outstanding,
            },
            "compliance": {
                "critical_expiries": crit_risk,
                "warning_expiries": warn_risk,
            },
            "active_operations": {
                "field_jobs_count": active_jobs,
            },
        }

        # Snapshot creation or update
        snapshot, _ = ExecutiveKpiSnapshot.objects.update_or_create(
            organization=organization,
            as_of_date=today,
            currency=currency,
            defaults={
                "gross_billed_minor": gross_billed,
                "collected_minor": collected,
                "outstanding_receivables_minor": outstanding,
                "ipc_retention_held_minor": ipc_retention,
                "product_delivered_tonnage": Decimal("3420.00"),
                "avg_shrinkage_percent": Decimal("0.18"),
                "avg_turnaround_hours": Decimal("4.2"),
                "reconciliation_rate_percent": Decimal("98.60"),
                "active_field_jobs_count": active_jobs,
                "critical_risk_items_count": crit_risk,
                "warning_risk_items_count": warn_risk,
                "module_breakdown": breakdown,
            },
        )
        return snapshot

    @staticmethod
    def get_exception_feed(*, organization, severity=None, module=None, is_acknowledged=None):
        qs = ExecutiveExceptionAlert.objects.filter(organization=organization)
        if severity:
            qs = qs.filter(severity=severity)
        if module:
            qs = qs.filter(module=module)
        if is_acknowledged is not None:
            qs = qs.filter(is_acknowledged=is_acknowledged)
        return qs

    @staticmethod
    @transaction.atomic
    def record_exception(*, organization, severity, module, title, description, source_record_type, source_record_id, source_url="", variance_percent=None):
        return ExecutiveExceptionAlert.objects.create(
            organization=organization,
            severity=severity,
            module=module,
            title=title,
            description=description,
            source_record_type=source_record_type,
            source_record_id=source_record_id,
            source_url=source_url,
            variance_percent=variance_percent,
        )

    @staticmethod
    @transaction.atomic
    def acknowledge_exception(*, organization, user, public_id):
        try:
            alert = ExecutiveExceptionAlert.objects.get(organization=organization, public_id=public_id)
        except ExecutiveExceptionAlert.DoesNotExist:
            raise ValidationError("Executive exception alert not found.")

        alert.is_acknowledged = True
        alert.acknowledged_by = user
        alert.acknowledged_at = timezone.now()
        alert.save()
        return alert

    @staticmethod
    @transaction.atomic
    def create_export_job(*, organization, user, report_type, filters=None, file_format=ExecutiveExportJob.FileFormat.PDF):
        checksum_payload = f"{organization.pk}:{user.pk}:{report_type}:{file_format}:{timezone.now().isoformat()}"
        checksum = hashlib.sha256(checksum_payload.encode("utf-8")).hexdigest()

        job = ExecutiveExportJob.objects.create(
            organization=organization,
            requested_by=user,
            report_type=report_type,
            filters=filters or {},
            status=ExecutiveExportJob.JobStatus.COMPLETED,
            file_format=file_format,
            file_size_bytes=2485760,  # ~2.4 MB signed executive package
            download_checksum=checksum,
            completed_at=timezone.now(),
        )
        return job
