from django.contrib.auth import get_user_model
from django.db import DatabaseError, connection
from django.test import TransactionTestCase

from client_portal.models import (
    ClientPortalAccessLog,
    ClientPortalProfile,
    SharedDeliverablePackage,
)
from organizations.models import Membership, Organization

User = get_user_model()


class ClientPortalDatabaseSecurityTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.alpha_user = User.objects.create_user(username="portal-rls-alpha@test.local", email="portal-rls-alpha@test.local", password="password")
        self.bravo_user = User.objects.create_user(username="portal-rls-bravo@test.local", email="portal-rls-bravo@test.local", password="password")
        self.alpha_org = Organization.objects.create(name="Portal RLS Alpha", slug="portal-rls-alpha")
        self.bravo_org = Organization.objects.create(name="Portal RLS Bravo", slug="portal-rls-bravo")
        Membership.objects.create(user=self.alpha_user, organization=self.alpha_org, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo_org, role=Membership.Role.OWNER)

        self.alpha_profile = ClientPortalProfile.objects.create(
            organization=self.alpha_org,
            user=self.alpha_user,
            client_name="Alpha Client Corporation",
        )
        self.bravo_profile = ClientPortalProfile.objects.create(
            organization=self.bravo_org,
            user=self.bravo_user,
            client_name="Bravo Client Corporation",
        )

        self.alpha_pkg = SharedDeliverablePackage.objects.create(
            organization=self.alpha_org,
            client_name="Alpha Client Corporation",
            title="Alpha Certified BDN",
            deliverable_type=SharedDeliverablePackage.DeliverableType.BUNKER_BDN,
            source_reference="BDN-RLS-01",
            created_by=self.alpha_user,
        )
        self.bravo_pkg = SharedDeliverablePackage.objects.create(
            organization=self.bravo_org,
            client_name="Bravo Client Corporation",
            title="Bravo Certified BDN",
            deliverable_type=SharedDeliverablePackage.DeliverableType.BUNKER_BDN,
            source_reference="BDN-RLS-02",
            created_by=self.bravo_user,
        )

        self.alpha_log = ClientPortalAccessLog.objects.create(
            organization=self.alpha_org,
            client_user=self.alpha_user,
            client_name="Alpha Client Corporation",
            action="VIEW_DELIVERABLE",
            resource_type="SharedDeliverablePackage",
            resource_reference="BDN-RLS-01",
        )

    def test_runtime_database_role_hides_and_rejects_cross_tenant_rows(self):
        with connection.cursor() as cursor:
            cursor.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO petroledger_app")
            cursor.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO petroledger_app")
            cursor.execute("SET ROLE petroledger_app")
            try:
                cursor.execute("SELECT set_config('app.current_user_id', %s, false)", (str(self.alpha_user.pk),))
                cursor.execute("SELECT source_reference FROM client_portal_shareddeliverablepackage ORDER BY source_reference")
                rows = cursor.fetchall()
                self.assertEqual(rows, [("BDN-RLS-01",)])

                # Attempt cross-tenant insert into Bravo org under Alpha user context
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        """
                        INSERT INTO client_portal_shareddeliverablepackage (
                            public_id, organization_id, client_name, title, deliverable_type,
                            source_reference, summary_metadata, verification_seal, created_by_id, created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), %s, 'Cross Injected', 'Tamper', 'bunker_bdn',
                            'REF-TAMPER', '{}'::jsonb, 'abc', %s, now(), now()
                        )
                        """,
                        (self.bravo_org.pk, self.alpha_user.pk),
                    )
            finally:
                cursor.execute("RESET ROLE")

    def test_client_portal_access_logs_are_immutable_in_database(self):
        with connection.cursor() as cursor:
            cursor.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO petroledger_app")
            cursor.execute("SET ROLE petroledger_app")
            try:
                cursor.execute("SELECT set_config('app.current_user_id', %s, false)", (str(self.alpha_user.pk),))
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        "UPDATE client_portal_clientportalaccesslog SET action = 'TAMPERED' WHERE id = %s",
                        (self.alpha_log.pk,),
                    )
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        "DELETE FROM client_portal_clientportalaccesslog WHERE id = %s",
                        (self.alpha_log.pk,),
                    )
            finally:
                cursor.execute("RESET ROLE")
