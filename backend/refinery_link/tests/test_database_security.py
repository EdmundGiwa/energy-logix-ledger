from decimal import Decimal
from django.contrib.auth import get_user_model
from django.db import DatabaseError, connection
from django.test import TransactionTestCase

from organizations.models import Membership, Organization
from refinery_link.models import (
    DepotTank,
    OfftakeAppointment,
    RefineryAuditEvent,
    Terminal,
)


User = get_user_model()


class RefineryDatabaseSecurityTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.alpha_user = User.objects.create_user(username="ref-rls-alpha@test.local", email="ref-rls-alpha@test.local", password="password")
        self.bravo_user = User.objects.create_user(username="ref-rls-bravo@test.local", email="ref-rls-bravo@test.local", password="password")
        self.alpha_org = Organization.objects.create(name="Refinery RLS Alpha", slug="ref-rls-alpha")
        self.bravo_org = Organization.objects.create(name="Refinery RLS Bravo", slug="ref-rls-bravo")
        Membership.objects.create(user=self.alpha_user, organization=self.alpha_org, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo_org, role=Membership.Role.OWNER)

        self.alpha_terminal = Terminal.objects.create(
            organization=self.alpha_org,
            code="LEKKI-RLS-01",
            name="Alpha Terminal",
            location="Lekki",
        )
        self.bravo_terminal = Terminal.objects.create(
            organization=self.bravo_org,
            code="IBADAN-RLS-01",
            name="Bravo Terminal",
            location="Ibadan",
        )
        self.alpha_tank = DepotTank.objects.create(
            organization=self.alpha_org,
            terminal=self.alpha_terminal,
            tank_number="TK-01",
            product_type=DepotTank.ProductType.AGO,
            nominal_capacity_litres=Decimal("10000000.00"),
            safe_fill_level_mm=10000,
        )
        self.audit_event = RefineryAuditEvent.objects.create(
            organization=self.alpha_org,
            actor=self.alpha_user,
            action="init",
            target_type="terminal",
            target_id=self.alpha_terminal.public_id,
            reason="Initial provisioning",
        )

    def test_runtime_database_role_hides_and_rejects_cross_tenant_rows(self):
        with connection.cursor() as cursor:
            cursor.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO petroledger_app")
            cursor.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO petroledger_app")
            cursor.execute("SET ROLE petroledger_app")
            try:
                cursor.execute("SELECT set_config('app.current_user_id', %s, false)", (str(self.alpha_user.pk),))
                cursor.execute("SELECT code FROM refinery_link_terminal ORDER BY code")
                self.assertEqual([row[0] for row in cursor.fetchall()], ["LEKKI-RLS-01"])

                # Cross-tenant insert on terminal must fail RLS
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        """
                        INSERT INTO refinery_link_terminal (
                            public_id, organization_id, code, name, location,
                            is_active, created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), %s, 'FORGED-TERM', 'Denied Terminal',
                            'Nowhere', true, now(), now()
                        )
                        """,
                        (self.bravo_org.pk,),
                    )

                # Cross-tenant terminal reference in appointment must be rejected by trigger
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        """
                        INSERT INTO refinery_link_offtakeappointment (
                            public_id, organization_id, terminal_id, reference,
                            truck_plate, driver_name, driver_phone, driver_license,
                            product_type, nominated_volume_litres, holding_park_slot,
                            rfid_tag, e_callup_reference, status, scheduled_at,
                            version, notes, created_by_id, updated_by_id, created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), %s, %s, 'FORGED-APPT',
                            'LAG-999', 'Driver', '', '', 'ago', 45000, '', '', '',
                            'scheduled', now(), 1, '', %s, %s, now(), now()
                        )
                        """,
                        (self.alpha_org.pk, self.bravo_terminal.pk, self.alpha_user.pk, self.alpha_user.pk),
                    )
            finally:
                cursor.execute("ROLLBACK")
                cursor.execute("RESET ROLE")

    def test_refinery_audit_events_are_database_immutable(self):
        with connection.cursor() as cursor:
            with self.assertRaises(DatabaseError):
                cursor.execute("UPDATE refinery_link_refineryauditevent SET action = 'tampered' WHERE id = %s", (self.audit_event.pk,))
            with self.assertRaises(DatabaseError):
                cursor.execute("DELETE FROM refinery_link_refineryauditevent WHERE id = %s", (self.audit_event.pk,))
