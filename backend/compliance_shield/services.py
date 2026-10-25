from datetime import date
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from compliance_shield.models import (
    AuditNonConformance,
    ComplianceAuditEvent,
    ComplianceEvidencePack,
    IsoManagementSystemAudit,
    RegulatoryCertificate,
)


class ConflictError(Exception):
    pass


class ComplianceService:
    @staticmethod
    def audit(*, organization, entity_type, entity_id, actor, action, from_status="", to_status="", reason="", metadata=None):
        return ComplianceAuditEvent.objects.create(
            organization=organization,
            entity_type=entity_type,
            entity_id=str(entity_id),
            actor=actor,
            action=action,
            from_status=from_status,
            to_status=to_status,
            reason=reason,
            metadata=metadata or {},
        )

    @staticmethod
    @transaction.atomic
    def create_certificate(*, organization, user, data):
        cert = RegulatoryCertificate.objects.create(
            organization=organization,
            regulator=data["regulator"],
            certificate_type=data["certificate_type"],
            certificate_number=data["certificate_number"],
            issuing_authority=data["issuing_authority"],
            issue_date=data["issue_date"],
            expiry_date=data["expiry_date"],
            document_reference=data.get("document_reference", ""),
            notes=data.get("notes", ""),
        )
        cert.status = cert.calculate_status()
        cert.save()

        ComplianceService.audit(
            organization=organization,
            entity_type="RegulatoryCertificate",
            entity_id=cert.public_id,
            actor=user,
            action="create_certificate",
            to_status=cert.status,
            reason=f"Registered certificate {cert.certificate_number} ({cert.regulator})",
        )
        return cert

    @staticmethod
    @transaction.atomic
    def update_certificate(*, organization, user, cert, data, version):
        if cert.organization_id != organization.id:
            raise ValidationError("Certificate does not belong to organization.")

        if cert.version != version:
            raise ConflictError(f"Stale certificate version. Expected {cert.version}, got {version}.")

        for attr in ("certificate_type", "issuing_authority", "document_reference", "notes"):
            if attr in data:
                setattr(cert, attr, data[attr])

        if "expiry_date" in data:
            cert.expiry_date = data["expiry_date"]
            cert.status = cert.calculate_status()

        cert.version += 1
        cert.save()

        ComplianceService.audit(
            organization=organization,
            entity_type="RegulatoryCertificate",
            entity_id=cert.public_id,
            actor=user,
            action="update_certificate",
            to_status=cert.status,
            reason="Certificate details modified",
        )
        return cert

    @staticmethod
    @transaction.atomic
    def record_renewal_submission(*, organization, user, cert, tracking_number, reason=""):
        if cert.organization_id != organization.id:
            raise ValidationError("Certificate does not belong to organization.")

        from_status = cert.status
        cert.status = RegulatoryCertificate.Status.RENEWAL_IN_PROGRESS
        cert.renewal_tracking_number = tracking_number
        cert.version += 1
        cert.save()

        ComplianceService.audit(
            organization=organization,
            entity_type="RegulatoryCertificate",
            entity_id=cert.public_id,
            actor=user,
            action="record_renewal_submission",
            from_status=from_status,
            to_status=cert.status,
            reason=reason or f"Submitted renewal application #{tracking_number}",
        )
        return cert

    @staticmethod
    @transaction.atomic
    def verify_certificate(*, organization, user, cert, new_expiry_date=None, reason=""):
        if cert.organization_id != organization.id:
            raise ValidationError("Certificate does not belong to organization.")

        from_status = cert.status
        if new_expiry_date:
            if isinstance(new_expiry_date, str):
                new_expiry_date = date.fromisoformat(new_expiry_date)
            cert.expiry_date = new_expiry_date
        cert.status = RegulatoryCertificate.Status.VALID
        cert.verified_by = user
        cert.verified_at = timezone.now()
        cert.version += 1
        cert.save()

        ComplianceService.audit(
            organization=organization,
            entity_type="RegulatoryCertificate",
            entity_id=cert.public_id,
            actor=user,
            action="verify_certificate",
            from_status=from_status,
            to_status=cert.status,
            reason=reason or "Certificate authenticity verified and accepted into compliance shield",
        )
        return cert

    @staticmethod
    @transaction.atomic
    def create_iso_audit(*, organization, user, data):
        audit = IsoManagementSystemAudit.objects.create(
            organization=organization,
            standard=data["standard"],
            audit_type=data["audit_type"],
            audit_scope=data["audit_scope"],
            certification_body=data["certification_body"],
            lead_auditor=data["lead_auditor"],
            audit_date=data["audit_date"],
            next_audit_due=data["next_audit_due"],
            overall_outcome=data.get("overall_outcome", IsoManagementSystemAudit.OverallOutcome.CERTIFIED),
            certificate_number=data.get("certificate_number", ""),
            notes=data.get("notes", ""),
        )

        ComplianceService.audit(
            organization=organization,
            entity_type="IsoManagementSystemAudit",
            entity_id=audit.public_id,
            actor=user,
            action="create_iso_audit",
            to_status=audit.overall_outcome,
            reason=f"Recorded audit for {audit.standard} by {audit.certification_body}",
        )
        return audit

    @staticmethod
    @transaction.atomic
    def log_ncr(*, organization, user, audit, data):
        if audit.organization_id != organization.id:
            raise ValidationError("Audit does not belong to organization.")

        count = AuditNonConformance.objects.filter(organization=organization).count() + 1
        ncr_number = data.get("ncr_number") or f"NCR-{timezone.now().strftime('%Y%m')}-{count:04d}"

        ncr = AuditNonConformance.objects.create(
            organization=organization,
            audit=audit,
            ncr_number=ncr_number,
            severity=data["severity"],
            finding_description=data["finding_description"],
            root_cause_analysis=data.get("root_cause_analysis", ""),
            corrective_action_plan=data.get("corrective_action_plan", ""),
            target_closure_date=data["target_closure_date"],
            assigned_to=data["assigned_to"],
            status=AuditNonConformance.Status.OPEN,
        )

        audit.open_ncrs_count += 1
        audit.save()

        ComplianceService.audit(
            organization=organization,
            entity_type="AuditNonConformance",
            entity_id=ncr.public_id,
            actor=user,
            action="log_ncr",
            to_status=ncr.status,
            reason=f"Logged non-conformance {ncr.ncr_number} ({ncr.severity})",
        )
        return ncr

    @staticmethod
    @transaction.atomic
    def close_ncr(*, organization, user, ncr, reason=""):
        if ncr.organization_id != organization.id:
            raise ValidationError("NCR does not belong to organization.")

        ncr.status = AuditNonConformance.Status.CLOSED
        ncr.closed_at = timezone.now().date()
        ncr.save()

        audit = ncr.audit
        if audit.open_ncrs_count > 0:
            audit.open_ncrs_count -= 1
        audit.closed_ncrs_count += 1
        audit.save()

        ComplianceService.audit(
            organization=organization,
            entity_type="AuditNonConformance",
            entity_id=ncr.public_id,
            actor=user,
            action="close_ncr",
            from_status="open",
            to_status="closed",
            reason=reason or f"Closed NCR {ncr.ncr_number}",
        )
        return ncr

    @staticmethod
    @transaction.atomic
    def compile_evidence_pack(*, organization, user, data):
        certs = RegulatoryCertificate.objects.filter(organization=organization)
        audits = IsoManagementSystemAudit.objects.filter(organization=organization)

        cert_snapshot = [
            {
                "regulator": c.regulator,
                "certificate_type": c.certificate_type,
                "certificate_number": c.certificate_number,
                "issuing_authority": c.issuing_authority,
                "expiry_date": str(c.expiry_date),
                "status": c.status,
                "days_to_expiry": c.days_to_expiry,
                "document_reference": c.document_reference,
            }
            for c in certs
        ]

        audit_snapshot = [
            {
                "standard": a.standard,
                "certification_body": a.certification_body,
                "certificate_number": a.certificate_number,
                "overall_outcome": a.overall_outcome,
                "audit_date": str(a.audit_date),
                "next_audit_due": str(a.next_audit_due),
                "open_ncrs": a.open_ncrs_count,
            }
            for a in audits
        ]

        dossier = {
            "organization_name": organization.name,
            "compiled_at": timezone.now().isoformat(),
            "target_stakeholder": data["target_stakeholder"],
            "total_certificates": len(cert_snapshot),
            "certificates": cert_snapshot,
            "iso_management_systems": audit_snapshot,
        }

        pack = ComplianceEvidencePack.objects.create(
            organization=organization,
            pack_name=data["pack_name"],
            target_stakeholder=data["target_stakeholder"],
            status=ComplianceEvidencePack.Status.READY,
            dossier_data=dossier,
            compiled_by=user,
            notes=data.get("notes", ""),
        )

        ComplianceService.audit(
            organization=organization,
            entity_type="ComplianceEvidencePack",
            entity_id=pack.public_id,
            actor=user,
            action="compile_evidence_pack",
            to_status=pack.status,
            reason=f"Compiled statutory evidence pack '{pack.pack_name}'",
        )
        return pack
