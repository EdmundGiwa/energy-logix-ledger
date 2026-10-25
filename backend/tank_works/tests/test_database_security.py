from decimal import Decimal
from django.contrib.auth import get_user_model
from django.db import DatabaseError, connection
from django.test import TransactionTestCase

from organizations.models import Membership, Organization
from tank_works.models import (
    CoatingInspection,
    CrewEquipmentUtilization,
    SludgeWasteManifest,
    TankFieldJob,
    TankWorksAuditEvent,
)

User = get_user_model()


class TankWorksDatabaseSecurityTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.alpha_user = User.objects.create_user(username="tank-rls-alpha@test.local", email="tank-rls-alpha@test.local", password="password")
        self.bravo_user = User.objects.create_user(username="tank-rls-bravo@test.local", email="tank-rls-bravo@test.local", password="password")
        self.alpha_org = Organization.objects.create(name="Tank RLS Alpha", slug="tank-rls-alpha")
        self.bravo_org = Organization.objects.create(name="Tank RLS Bravo", slug="tank-rls-bravo")
        Membership.objects.create(user=self.alpha_user, organization=self.alpha_org, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo_org, role=Membership.Role.OWNER)

        self.alpha_job = TankFieldJob.objects.create(
            organization=self.alpha_org,
            job_number="TW-RLS-001",
            client_name="Alpha Client",
            terminal_or_facility="Alpha Terminal",
            tank_identifier="TK-RLS-1",
            scope_of_work=TankFieldJob.ScopeOfWork.EVACUATION_CLEANING,
            created_by=self.alpha_user,
            updated_by=self.alpha_user,
        )
        self.bravo_job = TankFieldJob.objects.create(
            organization=self.bravo_org,
            job_number="TW-RLS-002",
            client_name="Bravo Client",
            terminal_or_facility="Bravo Terminal",
            tank_identifier="TK-RLS-2",
            scope_of_work=TankFieldJob.ScopeOfWork.BLASTING_COATING,
            created_by=self.bravo_user,
            updated_by=self.bravo_user,
        )

        self.alpha_audit = TankWorksAuditEvent.objects.create(
            organization=self.alpha_org,
            job=self.alpha_job,
            actor=self.alpha_user,
            action="create_job",
            to_status="draft",
            reason="Initial job initialization",
        )

    def test_runtime_database_role_hides_and_rejects_cross_tenant_rows(self):
        with connection.cursor() as cursor:
            cursor.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO petroledger_app")
            cursor.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO petroledger_app")
            cursor.execute("SET ROLE petroledger_app")
            try:
                cursor.execute("SELECT set_config('app.current_user_id', %s, false)", (str(self.alpha_user.pk),))
                cursor.execute("SELECT job_number FROM tank_works_tankfieldjob ORDER BY job_number")
                self.assertEqual([row[0] for row in cursor.fetchall()], ["TW-RLS-001"])

                # Cross-tenant insert must fail RLS
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        """
                        INSERT INTO tank_works_tankfieldjob (
                            public_id, organization_id, job_number, client_name,
                            terminal_or_facility, tank_identifier, scope_of_work,
                            status, safepass_permit_ref, gas_test_cleared,
                            estimated_cost_minor, actual_cost_minor, currency, version,
                            notes, created_by_id, updated_by_id, created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), %s, 'FORGED-JOB', 'Hacker Inc',
                            'Unauthorized Terminal', 'TK-FORGE', 'evac_cleaning',
                            'draft', '', false,
                            0, 0, 'NGN', 1,
                            '', %s, %s, now(), now()
                        )
                        """,
                        (self.bravo_org.pk, self.alpha_user.pk, self.alpha_user.pk),
                    )

                # Cross-tenant job reference in waste manifest must fail trigger
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        """
                        INSERT INTO tank_works_sludgewastemanifest (
                            public_id, organization_id, job_id, manifest_number,
                            waste_classification, quantity, unit_of_measure,
                            transporter_name, vehicle_registration, driver_name,
                            nesrea_permit_number, disposal_facility, treatment_method,
                            is_consignment_signed, dispatched_at, notes,
                            created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), %s, %s, 'SWM-FORGED-01',
                            'hydrocarbon_sludge', 10.00, 'metric_tonnes',
                            'Illegal Transporter', 'FORGE-123', 'John Doe',
                            '', 'Illegal Dump', 'None',
                            false, now(), '',
                            now(), now()
                        )
                        """,
                        (self.alpha_org.pk, self.bravo_job.pk),
                    )
            finally:
                cursor.execute("ROLLBACK")
                cursor.execute("RESET ROLE")

    def test_audit_events_are_database_immutable(self):
        with connection.cursor() as cursor:
            with self.assertRaises(DatabaseError):
                cursor.execute(
                    "UPDATE tank_works_tankworksauditevent SET reason = 'tampered' WHERE id = %s",
                    (self.alpha_audit.pk,),
                )
            with self.assertRaises(DatabaseError):
                cursor.execute(
                    "DELETE FROM tank_works_tankworksauditevent WHERE id = %s",
                    (self.alpha_audit.pk,),
                )
