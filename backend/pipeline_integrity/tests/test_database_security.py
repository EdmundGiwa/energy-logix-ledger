from django.contrib.auth import get_user_model
from django.db import DatabaseError, connection
from django.test import TransactionTestCase

from organizations.models import Membership, Organization
from pipeline_integrity.models import (
    Hydrotest,
    PigRun,
    PipelineAsset,
    PipelineAuditEvent,
)


User = get_user_model()


class PipelineDatabaseSecurityTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.first_user = User.objects.create_user(username="pipe-rls-first@test.local", email="pipe-rls-first@test.local", password="password")
        self.second_user = User.objects.create_user(username="pipe-rls-second@test.local", email="pipe-rls-second@test.local", password="password")
        self.first_org = Organization.objects.create(name="Pipeline RLS First", slug="pipe-rls-first")
        self.second_org = Organization.objects.create(name="Pipeline RLS Second", slug="pipe-rls-second")
        Membership.objects.create(user=self.first_user, organization=self.first_org, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.second_user, organization=self.second_org, role=Membership.Role.OWNER)

        self.first_asset = PipelineAsset.objects.create(
            organization=self.first_org,
            reference="PIPE-RLS-01",
            name="Alpha Pipeline 18-inch",
            fluid_type=PipelineAsset.FluidType.LIQUID,
            governing_code="ASME B31.4",
        )
        self.second_asset = PipelineAsset.objects.create(
            organization=self.second_org,
            reference="PIPE-RLS-02",
            name="Bravo Pipeline 24-inch",
            fluid_type=PipelineAsset.FluidType.GAS,
            governing_code="ASME B31.8",
        )
        self.pig_run = PigRun.objects.create(
            organization=self.first_org,
            asset=self.first_asset,
            reference="PIG-RLS-01",
            pig_type="Scraper",
            launcher_kp="0.000",
            receiver_kp="10.000",
            created_by=self.first_user,
            updated_by=self.first_user,
        )
        self.hydrotest = Hydrotest.objects.create(
            organization=self.first_org,
            asset=self.first_asset,
            reference="HT-RLS-01",
            test_pressure_bar="120.000",
            hold_duration_minutes=480,
            created_by=self.first_user,
            updated_by=self.first_user,
        )
        self.audit_event = PipelineAuditEvent.objects.create(
            organization=self.first_org,
            asset=self.first_asset,
            actor=self.first_user,
            action="create_asset",
            from_status="",
            to_status="active",
            reason="Initial asset commissioning",
        )

    def test_runtime_database_role_hides_and_rejects_cross_tenant_rows(self):
        with connection.cursor() as cursor:
            cursor.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO petroledger_app")
            cursor.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO petroledger_app")
            cursor.execute("SET ROLE petroledger_app")
            try:
                cursor.execute("SELECT set_config('app.current_user_id', %s, false)", (str(self.first_user.pk),))
                cursor.execute("SELECT reference FROM pipeline_integrity_pipelineasset ORDER BY reference")
                self.assertEqual([row[0] for row in cursor.fetchall()], ["PIPE-RLS-01"])

                # Cross-tenant insert on asset must fail
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        """
                        INSERT INTO pipeline_integrity_pipelineasset (
                            public_id, organization_id, reference, name, fluid_type,
                            governing_code, is_active, created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), %s, 'FORGED-PIPE-ASSET', 'Denied Asset',
                            'liquid', 'ASME B31.4', true, now(), now()
                        )
                        """,
                        (self.second_org.pk,),
                    )

                # Cross-tenant asset reference in pig run must be rejected by trigger
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        """
                        INSERT INTO pipeline_integrity_pigrun (
                            public_id, organization_id, asset_id, reference, pig_type,
                            launcher_kp, receiver_kp, status, version, created_by_id,
                            updated_by_id, created_at, updated_at, notes
                        ) VALUES (
                            gen_random_uuid(), %s, %s, 'FORGED-PIG-RUN', 'Scraper',
                            0.0, 5.0, 'draft', 1, %s, %s, now(), now(), ''
                        )
                        """,
                        (self.first_org.pk, self.second_asset.pk, self.first_user.pk, self.first_user.pk),
                    )
            finally:
                cursor.execute("ROLLBACK")
                cursor.execute("RESET ROLE")

    def test_pipeline_audit_events_are_database_immutable(self):
        with connection.cursor() as cursor:
            with self.assertRaises(DatabaseError):
                cursor.execute("UPDATE pipeline_integrity_pipelineauditevent SET action = 'tampered' WHERE id = %s", (self.audit_event.pk,))
            with self.assertRaises(DatabaseError):
                cursor.execute("DELETE FROM pipeline_integrity_pipelineauditevent WHERE id = %s", (self.audit_event.pk,))
