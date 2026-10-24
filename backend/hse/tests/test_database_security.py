from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import DatabaseError, connection
from django.test import TransactionTestCase
from django.utils import timezone

from hse.models import GasTest, HseAuditEvent, Permit, SafetyProcedure, Worker
from organizations.models import Membership, Organization


User = get_user_model()


class SafePassDatabaseSecurityTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.first_user = User.objects.create_user(username="hse-rls-first@test.local", email="hse-rls-first@test.local", password="password")
        self.second_user = User.objects.create_user(username="hse-rls-second@test.local", email="hse-rls-second@test.local", password="password")
        self.first_org = Organization.objects.create(name="SafePass RLS First", slug="hse-rls-first")
        self.second_org = Organization.objects.create(name="SafePass RLS Second", slug="hse-rls-second")
        Membership.objects.create(user=self.first_user, organization=self.first_org, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.second_user, organization=self.second_org, role=Membership.Role.OWNER)
        self.first_worker = self.make_worker(self.first_org, "HSE-RLS-FIRST")
        self.second_worker = self.make_worker(self.second_org, "HSE-RLS-SECOND")

        self.procedure = SafetyProcedure.objects.create(
            organization=self.first_org,
            name="Immutable record procedure",
            site="Test site",
            credential_buffer_days=30,
            oxygen_min_percent="19.50",
            oxygen_max_percent="23.50",
            max_lel_percent="10.00",
            max_h2s_ppm="5.00",
            required_credential_kinds=["bosiet"],
            is_approved=True,
            approved_by=self.first_user,
            approved_at=timezone.now(),
        )
        now = timezone.now()
        self.permit = Permit.objects.create(
            organization=self.first_org,
            reference="PTW-IMMUTABLE",
            kind=Permit.Kind.CONFINED_SPACE,
            title="Immutability verification",
            site="Test site",
            work_description="Verify append-only database controls",
            procedure=self.procedure,
            performing_authority=self.first_worker,
            starts_at=now,
            expires_at=now + timedelta(hours=8),
            hazards=["restricted access"],
            controls=["controlled entry"],
            created_by=self.first_user,
        )
        self.gas_test = GasTest.objects.create(
            organization=self.first_org,
            permit=self.permit,
            tested_at=now,
            oxygen_percent="20.90",
            lel_percent="0.00",
            h2s_ppm="0.00",
            instrument_reference="GAS-IMMUTABLE-001",
            instrument_calibration_expires_on=timezone.localdate() + timedelta(days=90),
            passed=True,
            recorded_by=self.first_user,
        )
        self.audit_event = HseAuditEvent.objects.create(
            organization=self.first_org,
            actor=self.first_user,
            target_type="permit",
            target_id=self.permit.public_id,
            action="create",
        )

    def make_worker(self, organization, employee_number):
        return Worker.objects.create(
            organization=organization,
            employee_number=employee_number,
            full_name=f"Worker {employee_number}",
            job_title="Technician",
        )

    def test_runtime_database_role_hides_and_rejects_cross_tenant_rows(self):
        with connection.cursor() as cursor:
            cursor.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO petroledger_app")
            cursor.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO petroledger_app")
            cursor.execute("SET ROLE petroledger_app")
            try:
                cursor.execute("SELECT set_config('app.current_user_id', %s, false)", (str(self.first_user.pk),))
                cursor.execute("SELECT employee_number FROM hse_worker ORDER BY employee_number")
                self.assertEqual([row[0] for row in cursor.fetchall()], ["HSE-RLS-FIRST"])
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        """
                        INSERT INTO hse_worker (
                            public_id, organization_id, employee_number, full_name,
                            job_title, email, phone_number, is_active, created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), %s, 'FORGED-HSE-WORKER', 'Denied Worker',
                            'Denied', '', '', true, now(), now()
                        )
                        """,
                        (self.second_org.pk,),
                    )
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        """
                        INSERT INTO hse_credential (
                            public_id, organization_id, worker_id, kind, certificate_number,
                            issuer, valid_from, expires_on, status, evidence_reference,
                            verified_by_id, verified_at, created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), %s, %s, 'bosiet', 'FORGED-HSE-CERT',
                            'Denied', current_date, current_date + 365, 'pending', '',
                            NULL, NULL, now(), now()
                        )
                        """,
                        (self.first_org.pk, self.second_worker.pk),
                    )
            finally:
                cursor.execute("ROLLBACK")
                cursor.execute("RESET ROLE")

    def test_gas_tests_and_audit_events_are_database_immutable(self):
        with connection.cursor() as cursor:
            with self.assertRaises(DatabaseError):
                cursor.execute("UPDATE hse_gastest SET passed = false WHERE id = %s", (self.gas_test.pk,))
            with self.assertRaises(DatabaseError):
                cursor.execute("DELETE FROM hse_gastest WHERE id = %s", (self.gas_test.pk,))
            with self.assertRaises(DatabaseError):
                cursor.execute("UPDATE hse_hseauditevent SET action = 'tampered' WHERE id = %s", (self.audit_event.pk,))
            with self.assertRaises(DatabaseError):
                cursor.execute("DELETE FROM hse_hseauditevent WHERE id = %s", (self.audit_event.pk,))
