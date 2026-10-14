from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import DatabaseError, connection
from django.test import TransactionTestCase
from django.utils import timezone

from organizations.models import Membership, Organization

from bunkering.models import Nomination


User = get_user_model()


class BunkerDatabaseSecurityTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.first_user = User.objects.create_user(username="rls-first@test.local", email="rls-first@test.local", password="password")
        self.second_user = User.objects.create_user(username="rls-second@test.local", email="rls-second@test.local", password="password")
        self.first_org = Organization.objects.create(name="RLS First", slug="rls-first")
        self.second_org = Organization.objects.create(name="RLS Second", slug="rls-second")
        Membership.objects.create(user=self.first_user, organization=self.first_org, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.second_user, organization=self.second_org, role=Membership.Role.OWNER)
        self.first_nomination = self.make_nomination(self.first_org, self.first_user, "RLS-FIRST")
        self.second_nomination = self.make_nomination(self.second_org, self.second_user, "RLS-SECOND")

    def make_nomination(self, organization, user, reference):
        start = timezone.now() + timedelta(days=1)
        return Nomination.objects.create(
            organization=organization,
            reference=reference,
            customer_name="Security Test",
            vessel_name="MT Isolation",
            port="Test Port",
            product_grade="Test Fuel",
            nominated_quantity_mt="10.000",
            delivery_window_start=start,
            delivery_window_end=start + timedelta(hours=1),
            created_by=user,
            updated_by=user,
        )

    def test_runtime_database_role_hides_and_rejects_cross_tenant_rows(self):
        with connection.cursor() as cursor:
            cursor.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO petroledger_app")
            cursor.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO petroledger_app")
            cursor.execute("SET ROLE petroledger_app")
            try:
                cursor.execute("SELECT set_config('app.current_user_id', %s, false)", (str(self.first_user.pk),))
                cursor.execute("SELECT reference FROM bunkering_nomination ORDER BY reference")
                self.assertEqual([row[0] for row in cursor.fetchall()], ["RLS-FIRST"])
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        """
                        INSERT INTO bunkering_sounding (
                            public_id, organization_id, nomination_id, tank_reference,
                            forward_sounding_m, aft_sounding_m, observed_volume_m3,
                            observed_temperature_c, density_kg_m3, reviewed_volume_m3,
                            reviewed_mass_mt, calculation_method_note, status, version,
                            recorded_by_id, reviewed_by_id, reviewed_at, created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), %s, %s, 'FORGED', 1, 1, 1, 20,
                            800, 1, 1, 'forged', 'draft', 1, %s, NULL, NULL, now(), now()
                        )
                        """,
                        (self.first_org.pk, self.second_nomination.pk, self.first_user.pk),
                    )
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        """
                        INSERT INTO bunkering_nomination (
                            public_id, organization_id, reference, customer_name, vessel_name,
                            imo_number, port, product_grade, nominated_quantity_mt,
                            delivery_window_start, delivery_window_end, notes, status, version,
                            created_by_id, updated_by_id, created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), %s, 'FORGED-CROSS-TENANT', 'Bad actor', 'MT Denied',
                            '', 'Denied', 'Denied', 1, now(), now() + interval '1 hour', '',
                            'draft', 1, %s, %s, now(), now()
                        )
                        """,
                        (self.second_org.pk, self.first_user.pk, self.first_user.pk),
                    )
            finally:
                cursor.execute("ROLLBACK")
                cursor.execute("RESET ROLE")
