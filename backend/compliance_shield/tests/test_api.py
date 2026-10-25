import datetime
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from compliance_shield.models import (
    AuditNonConformance,
    ComplianceAuditEvent,
    ComplianceEvidencePack,
    IsoManagementSystemAudit,
    RegulatoryCertificate,
)
from organizations.models import Membership, Organization

User = get_user_model()


class ComplianceShieldAPITests(APITestCase):
    def setUp(self):
        self.alpha_user = User.objects.create_user(
            username="comp-alpha@test.local",
            email="comp-alpha@test.local",
            password="password",
        )
        self.bravo_user = User.objects.create_user(
            username="comp-bravo@test.local",
            email="comp-bravo@test.local",
            password="password",
        )
        self.alpha = Organization.objects.create(name="Alpha Energy Logistics", slug="alpha-energy")
        self.bravo = Organization.objects.create(name="Bravo Marine Ops", slug="bravo-marine")
        Membership.objects.create(user=self.alpha_user, organization=self.alpha, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo, role=Membership.Role.OWNER)
        self.client.force_login(self.alpha_user)

        today = timezone.now().date()
        # Alpha Certificates
        self.cert_nuprc = RegulatoryCertificate.objects.create(
            organization=self.alpha,
            regulator=RegulatoryCertificate.Regulator.NUPRC,
            certificate_type="Offshore Pipeline Survey & Inspection Permit",
            certificate_number="NUPRC/PTS/2026/001",
            issuing_authority="Nigerian Upstream Petroleum Regulatory Commission",
            issue_date=today - datetime.timedelta(days=300),
            expiry_date=today + datetime.timedelta(days=20),  # Warning <= 30d
            status=RegulatoryCertificate.Status.EXPIRING_SOON,
        )

        self.cert_nimasa = RegulatoryCertificate.objects.create(
            organization=self.alpha,
            regulator=RegulatoryCertificate.Regulator.NIMASA,
            certificate_type="Cabotage Annual Vessel Registration",
            certificate_number="NIMASA/CAB/2026/882",
            issuing_authority="NIMASA Marine Safety Directorate",
            issue_date=today - datetime.timedelta(days=350),
            expiry_date=today + datetime.timedelta(days=5),  # Critical <= 7d
            status=RegulatoryCertificate.Status.EXPIRING_SOON,
        )

        # Bravo Certificate
        self.bravo_cert = RegulatoryCertificate.objects.create(
            organization=self.bravo,
            regulator=RegulatoryCertificate.Regulator.NCDMB,
            certificate_type="NOGIC JQS Marine Equipment Certificate",
            certificate_number="NCDMB/NOGIC/2026/999",
            issuing_authority="NCDMB Headquarters Yenagoa",
            issue_date=today - datetime.timedelta(days=100),
            expiry_date=today + datetime.timedelta(days=265),
            status=RegulatoryCertificate.Status.VALID,
        )

        # Alpha ISO Audit
        self.alpha_audit = IsoManagementSystemAudit.objects.create(
            organization=self.alpha,
            standard=IsoManagementSystemAudit.Standard.ISO_9001,
            audit_type=IsoManagementSystemAudit.AuditType.SURVEILLANCE,
            audit_scope="Offshore bunker supply and pipeline testing operations",
            certification_body="Bureau Veritas Nigeria",
            lead_auditor="Engr. K. Adeleke",
            audit_date=today - datetime.timedelta(days=10),
            next_audit_due=today + datetime.timedelta(days=355),
            overall_outcome=IsoManagementSystemAudit.OverallOutcome.CERTIFIED,
            certificate_number="BV-ISO-9001-2026",
        )

        # Alpha NCR
        self.alpha_ncr = AuditNonConformance.objects.create(
            organization=self.alpha,
            audit=self.alpha_audit,
            ncr_number="NCR-2026-0001",
            severity=AuditNonConformance.Severity.MINOR,
            finding_description="Calibration tags missing on ultrasonic thickness gauge UTG-04",
            target_closure_date=today + datetime.timedelta(days=14),
            assigned_to="Quality Assurance Lead",
            status=AuditNonConformance.Status.OPEN,
        )

        # Bravo ISO Audit
        self.bravo_audit = IsoManagementSystemAudit.objects.create(
            organization=self.bravo,
            standard=IsoManagementSystemAudit.Standard.ISO_14001,
            audit_type=IsoManagementSystemAudit.AuditType.INTERNAL,
            audit_scope="Bravo Marine environmental management",
            certification_body="Internal Audit Group",
            lead_auditor="Capt. J. Briggs",
            audit_date=today - datetime.timedelta(days=5),
            next_audit_due=today + datetime.timedelta(days=180),
            overall_outcome=IsoManagementSystemAudit.OverallOutcome.CERTIFIED,
        )

    def test_list_certificates_tenant_isolation(self):
        url = reverse("compliance_shield:certificates-list-create")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        cert_numbers = [item["certificate_number"] for item in res.data["results"]]
        self.assertIn("NUPRC/PTS/2026/001", cert_numbers)
        self.assertIn("NIMASA/CAB/2026/882", cert_numbers)
        self.assertNotIn("NCDMB/NOGIC/2026/999", cert_numbers)

    def test_compliance_summary(self):
        url = reverse("compliance_shield:summary")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["total_certificates"], 2)
        self.assertEqual(res.data["critical_alerts_7d"], 1)  # NIMASA cert <= 7 days
        self.assertEqual(res.data["warning_alerts_30d"], 1)   # NUPRC cert <= 30 days
        self.assertEqual(res.data["total_iso_audits"], 1)
        self.assertEqual(res.data["open_ncrs_count"], 1)

    def test_create_certificate(self):
        url = reverse("compliance_shield:certificates-list-create")
        payload = {
            "regulator": RegulatoryCertificate.Regulator.FMENV,
            "certificate_type": "Environmental Impact Assessment (EIA) Approval",
            "certificate_number": "FMENV/EIA/2026/410",
            "issuing_authority": "Federal Ministry of Environment Abuja",
            "issue_date": "2026-01-01",
            "expiry_date": "2026-12-31",
            "document_reference": "DOC-FMENV-EIA-410.pdf",
            "notes": "Approved for swamp dredging operations",
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["certificate_number"], "FMENV/EIA/2026/410")
        self.assertTrue(RegulatoryCertificate.objects.filter(certificate_number="FMENV/EIA/2026/410", organization=self.alpha).exists())

    def test_update_certificate_with_optimistic_locking(self):
        url = reverse("compliance_shield:certificates-detail", kwargs={"public_id": self.cert_nuprc.public_id})
        # Conflict on wrong version
        bad_payload = {
            "version": 999,
            "notes": "Invalid version update",
        }
        res = self.client.patch(url, bad_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

        # Successful update with correct version
        good_payload = {
            "version": self.cert_nuprc.version,
            "notes": "Updated permit tracking notes",
        }
        res = self.client.patch(url, good_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.cert_nuprc.refresh_from_db()
        self.assertEqual(self.cert_nuprc.notes, "Updated permit tracking notes")
        self.assertEqual(self.cert_nuprc.version, 2)

    def test_submit_renewal_action(self):
        url = reverse(
            "compliance_shield:certificates-action",
            kwargs={"public_id": self.cert_nuprc.public_id, "action": "submit_renewal"},
        )
        payload = {
            "renewal_tracking_number": "NUPRC-REN-2026-9918",
            "reason": "Submitted via NUPRC online regulatory portal",
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.cert_nuprc.refresh_from_db()
        self.assertEqual(self.cert_nuprc.status, RegulatoryCertificate.Status.RENEWAL_IN_PROGRESS)
        self.assertEqual(self.cert_nuprc.renewal_tracking_number, "NUPRC-REN-2026-9918")

    def test_verify_certificate_action(self):
        url = reverse(
            "compliance_shield:certificates-action",
            kwargs={"public_id": self.cert_nuprc.public_id, "action": "verify"},
        )
        payload = {
            "new_expiry_date": "2027-10-25",
            "reason": "Verified against official gazette registry",
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.cert_nuprc.refresh_from_db()
        self.assertEqual(self.cert_nuprc.status, RegulatoryCertificate.Status.VALID)
        self.assertEqual(str(self.cert_nuprc.expiry_date), "2027-10-25")
        self.assertEqual(self.cert_nuprc.verified_by, self.alpha_user)

    def test_cross_tenant_certificate_access_denied(self):
        url = reverse("compliance_shield:certificates-detail", kwargs={"public_id": self.bravo_cert.public_id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        action_url = reverse(
            "compliance_shield:certificates-action",
            kwargs={"public_id": self.bravo_cert.public_id, "action": "submit_renewal"},
        )
        res = self.client.post(action_url, {"renewal_tracking_number": "HACK"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_iso_audit_and_ncr_workflow(self):
        # Create ISO audit
        audit_url = reverse("compliance_shield:iso-audits-list-create")
        audit_payload = {
            "standard": IsoManagementSystemAudit.Standard.ISO_45001,
            "audit_type": IsoManagementSystemAudit.AuditType.CERTIFICATION,
            "audit_scope": "Occupational health and safety management in swamp barge operations",
            "certification_body": "DNV GL Nigeria",
            "lead_auditor": "Dr. T. Okonjo",
            "audit_date": "2026-10-20",
            "next_audit_due": "2027-10-20",
            "overall_outcome": IsoManagementSystemAudit.OverallOutcome.CERTIFIED,
            "certificate_number": "DNV-45001-2026-08",
        }
        res = self.client.post(audit_url, audit_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        audit_public_id = res.data["public_id"]

        # Log NCR
        ncr_url = reverse("compliance_shield:ncrs-list-create")
        ncr_payload = {
            "audit_id": audit_public_id,
            "severity": AuditNonConformance.Severity.MAJOR,
            "finding_description": "Gas detector calibration log out of date in Zone 1 compressor shelter",
            "target_closure_date": "2026-11-20",
            "assigned_to": "Senior Instrument Engineer",
        }
        res = self.client.post(ncr_url, ncr_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        ncr_public_id = res.data["public_id"]

        # Close NCR
        close_url = reverse("compliance_shield:ncrs-close", kwargs={"public_id": ncr_public_id})
        close_payload = {
            "reason": "Calibrated with certified 50% LEL methane test gas and tags replaced.",
        }
        res = self.client.post(close_url, close_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], AuditNonConformance.Status.CLOSED)

    def test_cross_tenant_ncr_creation_rejected(self):
        ncr_url = reverse("compliance_shield:ncrs-list-create")
        payload = {
            "audit_id": str(self.bravo_audit.public_id),
            "severity": AuditNonConformance.Severity.MINOR,
            "finding_description": "Cross tenant audit reference attempt",
            "target_closure_date": "2026-11-10",
            "assigned_to": "QA",
        }
        res = self.client.post(ncr_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_compile_evidence_pack(self):
        pack_url = reverse("compliance_shield:evidence-packs-list-create")
        payload = {
            "pack_name": "Shell SNEPCo Deepwater Prequalification Dossier",
            "target_stakeholder": "Shell Petroleum Development Company",
            "notes": "Consolidated evidence of valid NUPRC, NIMASA, and ISO certifications.",
        }
        res = self.client.post(pack_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["status"], ComplianceEvidencePack.Status.READY)
        self.assertEqual(res.data["dossier_data"]["total_certificates"], 2)
        self.assertEqual(len(res.data["dossier_data"]["iso_management_systems"]), 1)
