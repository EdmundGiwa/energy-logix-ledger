from datetime import date
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.db import DatabaseError, connection
from django.test import TransactionTestCase

from billing.models import (
    BillingAuditEvent,
    CommercialInvoice,
    Currency,
    CustomerAccount,
)
from organizations.models import Membership, Organization

User = get_user_model()


class BillingDatabaseSecurityTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.alpha_user = User.objects.create_user(username="billing-rls-alpha@test.local", email="billing-rls-alpha@test.local", password="password")
        self.bravo_user = User.objects.create_user(username="billing-rls-bravo@test.local", email="billing-rls-bravo@test.local", password="password")
        self.alpha_org = Organization.objects.create(name="Billing RLS Alpha", slug="billing-rls-alpha")
        self.bravo_org = Organization.objects.create(name="Billing RLS Bravo", slug="billing-rls-bravo")
        Membership.objects.create(user=self.alpha_user, organization=self.alpha_org, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo_org, role=Membership.Role.OWNER)

        self.alpha_customer = CustomerAccount.objects.create(
            organization=self.alpha_org,
            customer_code="CUST-RLS-01",
            name="Alpha Customer",
            currency=Currency.NGN,
        )

        self.bravo_customer = CustomerAccount.objects.create(
            organization=self.bravo_org,
            customer_code="CUST-RLS-02",
            name="Bravo Customer",
            currency=Currency.USD,
        )

        self.alpha_event = BillingAuditEvent.objects.create(
            organization=self.alpha_org,
            entity_type="CustomerAccount",
            entity_id=str(self.alpha_customer.public_id),
            actor=self.alpha_user,
            action="create_customer",
            to_status="active",
            reason="Initial registration",
        )

    def test_runtime_database_role_hides_and_rejects_cross_tenant_rows(self):
        with connection.cursor() as cursor:
            cursor.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO petroledger_app")
            cursor.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO petroledger_app")
            cursor.execute("SET ROLE petroledger_app")
            try:
                cursor.execute("SELECT set_config('app.current_user_id', %s, false)", (str(self.alpha_user.pk),))
                cursor.execute("SELECT customer_code FROM billing_customeraccount ORDER BY customer_code")
                self.assertEqual([row[0] for row in cursor.fetchall()], ["CUST-RLS-01"])

                # Cross-tenant insert must fail RLS
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        """
                        INSERT INTO billing_customeraccount (
                            public_id, organization_id, customer_code, name,
                            tax_id, contact_email, contact_phone, billing_address,
                            credit_limit_minor, currency, payment_terms_days, is_active,
                            created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), %s, 'FORGED-CUST', 'Hacker LLC',
                            '', '', '', '',
                            0, 'NGN', 30, true,
                            now(), now()
                        )
                        """,
                        (self.bravo_org.pk,),
                    )

                # Cross-tenant customer reference in commercial invoice must fail trigger
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        """
                        INSERT INTO billing_commercialinvoice (
                            public_id, organization_id, customer_id, invoice_number,
                            currency, exchange_rate_snapshot, issue_date, due_date,
                            subtotal_minor, vat_percent, vat_amount_minor, wht_percent,
                            wht_amount_minor, total_amount_minor, balance_due_minor,
                            status, version, notes, created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), %s, %s, 'INV-FORGED-01',
                            'NGN', 1.0000, '2026-10-25', '2026-11-25',
                            100000, 7.50, 7500, 5.00,
                            5000, 107500, 107500,
                            'draft', 1, '', now(), now()
                        )
                        """,
                        (self.alpha_org.pk, self.bravo_customer.pk),
                    )
            finally:
                cursor.execute("ROLLBACK")
                cursor.execute("RESET ROLE")

    def test_billing_audit_events_are_database_immutable(self):
        with connection.cursor() as cursor:
            with self.assertRaises(DatabaseError):
                cursor.execute(
                    "UPDATE billing_billingauditevent SET reason = 'tampered' WHERE id = %s",
                    (self.alpha_event.pk,),
                )
            with self.assertRaises(DatabaseError):
                cursor.execute(
                    "DELETE FROM billing_billingauditevent WHERE id = %s",
                    (self.alpha_event.pk,),
                )
