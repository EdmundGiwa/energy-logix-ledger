from datetime import date, timedelta
from django.contrib.auth import get_user_model
from django.db import DatabaseError, connection
from django.test import TransactionTestCase

from compliance_shield.models import (
    AuditNonConformance,
    ComplianceAuditEvent,
    IsoManagementSystemAudit,
    RegulatoryCertificate,
)
from organizations.models import Membership, Organization

User = get_user_model()


class ComplianceShieldDatabaseSecurityTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.alpha_user = User.objects.create_user(username="comp-rls-alpha@test.local", email="comp-rls-alpha@test.local", password="password")
        self.bravo_user = User.objects.create_user(username="comp-rls-bravo@test.local", email="comp-rls-bravo@test.local", password="password")
        self.alpha_org = Organization.objects.create(name="Compliance RLS Alpha", slug="comp-rls-alpha")
        self.bravo_org = Organization.objects.create(name="Compliance RLS Bravo", slug="comp-rls-bravo")
        Membership.objects.create(user=self.alpha_user, organization=self.alpha_org, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo_org, role=Membership.Role.OWNER)

        today = date.today()
        self.alpha_cert = RegulatoryCertificate.objects.create(
            organization=self.alpha_org,
            regulator=RegulatoryCertificate.Regulator.NUPRC,
            certificate_type="Offshore Survey Permit",
            certificate_number="NUPRC-RLS-01",
            issuing_authority="NUPRC",
            issue_date=today - timedelta(days=60),
            expiry_date=today + timedelta(days=305),
        )

        self.bravo_cert = RegulatoryCertificate.objects.create(
            organization=self.bravo_org,
            regulator=RegulatoryCertificate.Regulator.NIMASA,
            certificate_type="Cabotage Permit",
            certificate_number="NIMASA-RLS-02",
            issuing_authority="NIMASA",
            issue_date=today - timedelta(days=30),
            expiry_date=today + timedelta(days=335),
        )

        self.alpha_audit = IsoManagementSystemAudit.objects.create(
            organization=self.alpha_org,
            standard=IsoManagementSystemAudit.Standard.ISO_9001,
            audit_type=IsoManagementSystemAudit.AuditType.SURVEILLANCE,
            audit_scope="Quality Management System",
            certification_body="Bureau Veritas",
            lead_auditor="Lead Auditor",
            audit_date=today - timedelta(days=10),
            next_audit_due=today + timedelta(days=355),
        )

        self.bravo_audit = IsoManagementSystemAudit.objects.create(
            organization=self.bravo_org,
            standard=IsoManagementSystemAudit.Standard.ISO_14001,
            audit_type=IsoManagementSystemAudit.AuditType.INTERNAL,
            audit_scope="Environmental Management System",
            certification_body="Internal",
            lead_auditor="Lead Auditor",
            audit_date=today - timedelta(days=10),
            next_audit_due=today + timedelta(days=355),
        )

        self.alpha_event = ComplianceAuditEvent.objects.create(
            organization=self.alpha_org,
            entity_type="RegulatoryCertificate",
            entity_id=str(self.alpha_cert.public_id),
            actor=self.alpha_user,
            action="create_certificate",
            to_status="valid",
            reason="Initial registration",
        )

    def test_runtime_database_role_hides_and_rejects_cross_tenant_rows(self):
        with connection.cursor() as cursor:
            cursor.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO petroledger_app")
            cursor.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO petroledger_app")
            cursor.execute("SET ROLE petroledger_app")
            try:
                cursor.execute("SELECT set_config('app.current_user_id', %s, false)", (str(self.alpha_user.pk),))
                cursor.execute("SELECT certificate_number FROM compliance_shield_regulatorycertificate ORDER BY certificate_number")
                self.assertEqual([row[0] for row in cursor.fetchall()], ["NUPRC-RLS-01"])

                # Cross-tenant insert must fail RLS
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        """
                        INSERT INTO compliance_shield_regulatorycertificate (
                            public_id, organization_id, regulator, certificate_type,
                            certificate_number, issuing_authority, issue_date, expiry_date,
                            status, document_reference, renewal_tracking_number, version,
                            notes, created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), %s, 'firs', 'Tax Clearance',
                            'TCC-FORGED-01', 'FIRS', '2026-01-01', '2026-12-31',
                            'valid', '', '', 1,
                            '', now(), now()
                        )
                        """,
                        (self.bravo_org.pk,),
                    )

                # Cross-tenant foreign key trigger on audit non-conformance
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        """
                        INSERT INTO compliance_shield_auditnonconformance (
                            public_id, organization_id, audit_id, ncr_number,
                            severity, finding_description, root_cause_analysis,
                            corrective_action_plan, target_closure_date, status,
                            assigned_to, created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), %s, %s, 'NCR-FORGED-01',
                            'minor', 'Cross tenant attack', '',
                            '', '2026-12-01', 'open',
                            'Auditor', now(), now()
                        )
                        """,
                        (self.alpha_org.pk, self.bravo_audit.pk),
                    )
            finally:
                cursor.execute("ROLLBACK")
                cursor.execute("RESET ROLE")

    def test_compliance_audit_events_are_database_immutable(self):
        with connection.cursor() as cursor:
            with self.assertRaises(DatabaseError):
                cursor.execute(
                    "UPDATE compliance_shield_complianceauditevent SET reason = 'tampered' WHERE id = %s",
                    (self.alpha_event.pk,),
                )
            with self.assertRaises(DatabaseError):
                cursor.execute(
                    "DELETE FROM compliance_shield_complianceauditevent WHERE id = %s",
                    (self.alpha_event.pk,),
                )
