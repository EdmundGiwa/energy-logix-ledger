from django.contrib.auth import get_user_model
from django.db import DatabaseError, connection
from django.test import TransactionTestCase

from organizations.models import Membership, Organization
from owner_dashboard.models import (
    Currency,
    ExecutiveExceptionAlert,
    ExecutiveExportJob,
    ExecutiveKpiSnapshot,
)

User = get_user_model()


class OwnerDashboardDatabaseSecurityTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.alpha_user = User.objects.create_user(username="exec-rls-alpha@test.local", email="exec-rls-alpha@test.local", password="password")
        self.bravo_user = User.objects.create_user(username="exec-rls-bravo@test.local", email="exec-rls-bravo@test.local", password="password")

        self.alpha_org = Organization.objects.create(name="Executive RLS Alpha", slug="exec-rls-alpha")
        self.bravo_org = Organization.objects.create(name="Executive RLS Bravo", slug="exec-rls-bravo")

        Membership.objects.create(user=self.alpha_user, organization=self.alpha_org, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo_org, role=Membership.Role.OWNER)

        self.alpha_alert = ExecutiveExceptionAlert.objects.create(
            organization=self.alpha_org,
            severity=ExecutiveExceptionAlert.Severity.CRITICAL,
            module=ExecutiveExceptionAlert.ModuleSource.REFINERY_LINK,
            title="Alpha RLS Critical Alert",
            description="Alpha description",
            source_record_type="MeterTicket",
            source_record_id="TKT-RLS-01",
        )
        self.bravo_alert = ExecutiveExceptionAlert.objects.create(
            organization=self.bravo_org,
            severity=ExecutiveExceptionAlert.Severity.CRITICAL,
            module=ExecutiveExceptionAlert.ModuleSource.REFINERY_LINK,
            title="Bravo RLS Critical Alert",
            description="Bravo description",
            source_record_type="MeterTicket",
            source_record_id="TKT-RLS-02",
        )

    def test_runtime_database_role_hides_and_rejects_cross_tenant_rows(self):
        with connection.cursor() as cursor:
            cursor.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO petroledger_app")
            cursor.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO petroledger_app")
            cursor.execute("SET ROLE petroledger_app")
            try:
                cursor.execute("SELECT set_config('app.current_user_id', %s, false)", (str(self.alpha_user.pk),))
                cursor.execute("SELECT title FROM owner_dashboard_executiveexceptionalert ORDER BY title")
                rows = cursor.fetchall()
                self.assertEqual(rows, [("Alpha RLS Critical Alert",)])

                # Attempt cross-tenant insert into Bravo org under Alpha user context
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        """
                        INSERT INTO owner_dashboard_executiveexceptionalert (
                            public_id, organization_id, severity, module, title,
                            description, source_record_type, source_record_id, source_url,
                            is_acknowledged, created_at
                        ) VALUES (
                            gen_random_uuid(), %s, 'crit', 'bunkerflow', 'Cross Injected Alert',
                            'Illegal injection', 'BunkerStem', 'STEM-X', '', false, now()
                        )
                        """,
                        (self.bravo_org.pk,),
                    )
            finally:
                cursor.execute("RESET ROLE")
