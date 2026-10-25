from datetime import date, timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from billing.models import (
    BillingAuditEvent,
    CommercialInvoice,
    Currency,
    CustomerAccount,
    InterimPaymentCertificate,
    InvoiceLineItem,
    PaymentReceipt,
)
from organizations.models import Membership, Organization

User = get_user_model()


class BillingAPITests(APITestCase):
    def setUp(self):
        self.alpha_user = User.objects.create_user(
            username="billing-alpha@test.local",
            email="billing-alpha@test.local",
            password="password",
        )
        self.bravo_user = User.objects.create_user(
            username="billing-bravo@test.local",
            email="billing-bravo@test.local",
            password="password",
        )
        self.alpha = Organization.objects.create(name="Alpha Energy Commercial", slug="alpha-billing")
        self.bravo = Organization.objects.create(name="Bravo Logistics Commercial", slug="bravo-billing")
        Membership.objects.create(user=self.alpha_user, organization=self.alpha, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo, role=Membership.Role.OWNER)
        self.client.force_login(self.alpha_user)

        # Alpha Customer
        self.alpha_customer = CustomerAccount.objects.create(
            organization=self.alpha,
            customer_code="CUST-ALPHA-01",
            name="Shell Petroleum Development Company (SPDC)",
            tax_id="TIN-SPDC-9921",
            contact_email="commercial@shell.local",
            currency=Currency.NGN,
            credit_limit_minor=100_000_000_00,  # 100M NGN
            payment_terms_days=30,
        )

        # Bravo Customer
        self.bravo_customer = CustomerAccount.objects.create(
            organization=self.bravo,
            customer_code="CUST-BRAVO-01",
            name="Chevron Nigeria Limited",
            tax_id="TIN-CNL-4412",
            currency=Currency.USD,
            credit_limit_minor=500_000_00,  # $500,000 USD
            payment_terms_days=45,
        )

        # Alpha Invoice
        today = date.today()
        self.alpha_invoice = CommercialInvoice.objects.create(
            organization=self.alpha,
            customer=self.alpha_customer,
            invoice_number="INV-202610-0001",
            currency=Currency.NGN,
            issue_date=today - timedelta(days=15),
            due_date=today + timedelta(days=15),
            subtotal_minor=10_000_000_00,      # 10,000,000 NGN
            vat_percent=Decimal("7.50"),
            vat_amount_minor=750_000_00,       # 750,000 NGN
            wht_percent=Decimal("5.00"),
            wht_amount_minor=500_000_00,       # 500,000 NGN
            total_amount_minor=10_750_000_00,  # 10,750,000 NGN
            balance_due_minor=10_750_000_00,
            status=CommercialInvoice.Status.DRAFT,
            created_by=self.alpha_user,
        )

        InvoiceLineItem.objects.create(
            organization=self.alpha,
            invoice=self.alpha_invoice,
            source_module="bunkering",
            source_record_id="BDN-2026-001",
            description="Bunkering VLSFO Delivery 50 MT to MT Bonga Pioneer",
            quantity=Decimal("50.000"),
            unit_of_measure="MT",
            unit_rate_minor=200_000_00,
            amount_minor=10_000_000_00,
        )

        # Bravo Invoice
        self.bravo_invoice = CommercialInvoice.objects.create(
            organization=self.bravo,
            customer=self.bravo_customer,
            invoice_number="INV-BRAVO-0001",
            currency=Currency.USD,
            issue_date=today - timedelta(days=5),
            due_date=today + timedelta(days=40),
            subtotal_minor=50_000_00,
            vat_percent=Decimal("7.50"),
            vat_amount_minor=3_750_00,
            wht_percent=Decimal("5.00"),
            wht_amount_minor=2_500_00,
            total_amount_minor=53_750_00,
            balance_due_minor=53_750_00,
            status=CommercialInvoice.Status.DRAFT,
            created_by=self.bravo_user,
        )

        # Alpha IPC
        self.alpha_ipc = InterimPaymentCertificate.objects.create(
            organization=self.alpha,
            customer=self.alpha_customer,
            ipc_number="IPC-202610-0001",
            contract_reference="EPC-BONGA-NORTH-SUBSEA",
            project_name="Bonga North Subsea Flowline Installation",
            valuation_period_start=today - timedelta(days=60),
            valuation_period_end=today - timedelta(days=30),
            currency=Currency.NGN,
            gross_certified_minor=50_000_000_00,  # 50M NGN
            retention_percent=Decimal("5.00"),
            retention_amount_minor=2_500_000_00,  # 2.5M NGN
            advance_recovery_minor=5_000_000_00,  # 5M NGN
            net_certified_minor=42_500_000_00,    # 42.5M NGN
            status=InterimPaymentCertificate.Status.DRAFT,
        )

    def test_list_invoices_tenant_isolation(self):
        url = reverse("billing:invoices-list-create")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        numbers = [inv["invoice_number"] for inv in res.data["results"]]
        self.assertIn("INV-202610-0001", numbers)
        self.assertNotIn("INV-BRAVO-0001", numbers)

    def test_billing_summary(self):
        url = reverse("billing:summary")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["total_billed_minor"], 10_750_000_00)
        self.assertEqual(res.data["total_outstanding_minor"], 10_750_000_00)
        self.assertEqual(res.data["total_invoices_count"], 1)
        self.assertEqual(res.data["total_customers_count"], 1)
        self.assertEqual(res.data["total_ipcs_count"], 1)

    def test_create_customer_account(self):
        url = reverse("billing:customers-list-create")
        payload = {
            "name": "TotalEnergies EP Nigeria",
            "tax_id": "TIN-TOTAL-8812",
            "contact_email": "invoicing@totalenergies.local",
            "currency": Currency.NGN,
            "credit_limit_minor": 80_000_000_00,
            "payment_terms_days": 45,
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["name"], "TotalEnergies EP Nigeria")
        self.assertTrue(CustomerAccount.objects.filter(name="TotalEnergies EP Nigeria", organization=self.alpha).exists())

    def test_create_invoice_with_minor_unit_arithmetic(self):
        url = reverse("billing:invoices-list-create")
        payload = {
            "customer_id": str(self.alpha_customer.public_id),
            "currency": Currency.NGN,
            "vat_percent": "7.50",
            "wht_percent": "5.00",
            "line_items": [
                {
                    "source_module": "tank_works",
                    "description": "Storage Tank TK-104 Surface Preparation SA 2.5",
                    "quantity": "1.000",
                    "unit_of_measure": "job",
                    "unit_rate_minor": 4_000_000_00,  # 4M NGN
                },
                {
                    "source_module": "pipe_integrity",
                    "description": "Hydrotest 12-inch Trunkline 8km",
                    "quantity": "8.000",
                    "unit_of_measure": "km",
                    "unit_rate_minor": 500_000_00,    # 500k/km * 8 = 4M NGN
                },
            ],
            "notes": "Offshore campaign job costing billing",
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        # Subtotal: 4M + 4M = 8M (800,000,000 minor)
        self.assertEqual(res.data["subtotal_minor"], 8_000_000_00)
        # VAT 7.5%: 600,000 NGN (60,000,000 minor)
        self.assertEqual(res.data["vat_amount_minor"], 600_000_00)
        # WHT 5.0%: 400,000 NGN (40,000,000 minor)
        self.assertEqual(res.data["wht_amount_minor"], 400_000_00)
        # Total: 8M + 600k = 8.6M (860,000,000 minor)
        self.assertEqual(res.data["total_amount_minor"], 8_600_000_00)
        self.assertEqual(res.data["balance_due_minor"], 8_600_000_00)

    def test_issue_invoice_and_optimistic_locking(self):
        action_url = reverse(
            "billing:invoices-action",
            kwargs={"public_id": self.alpha_invoice.public_id, "action": "issue"},
        )
        # Stale version conflict
        bad_res = self.client.post(action_url, {"version": 999}, format="json")
        self.assertEqual(bad_res.status_code, status.HTTP_409_CONFLICT)

        # Successful issue
        res = self.client.post(action_url, {"version": self.alpha_invoice.version, "reason": "Authorized for dispatch"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.alpha_invoice.refresh_from_db()
        self.assertEqual(self.alpha_invoice.status, CommercialInvoice.Status.ISSUED)
        self.assertEqual(self.alpha_invoice.version, 2)

    def test_record_payment_and_customer_statement(self):
        # 1. Issue invoice first
        self.alpha_invoice.status = CommercialInvoice.Status.ISSUED
        self.alpha_invoice.save()

        # 2. Record partial payment of 5,000,000 NGN
        pmt_url = reverse("billing:payments-list-create")
        payload = {
            "customer_id": str(self.alpha_customer.public_id),
            "invoice_id": str(self.alpha_invoice.public_id),
            "payment_method": PaymentReceipt.PaymentMethod.BANK_TRANSFER,
            "transaction_reference": "NIP-CBN-20261025-99881",
            "amount_minor": 5_000_000_00,
            "currency": Currency.NGN,
            "notes": "First tranche direct transfer",
        }
        res = self.client.post(pmt_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        self.alpha_invoice.refresh_from_db()
        self.assertEqual(self.alpha_invoice.status, CommercialInvoice.Status.PARTIALLY_PAID)
        self.assertEqual(self.alpha_invoice.balance_due_minor, 5_750_000_00)  # 10.75M - 5M

        # 3. Check customer statement and ageing
        stmt_url = reverse("billing:customers-statement", kwargs={"public_id": self.alpha_customer.public_id})
        stmt_res = self.client.get(stmt_url)
        self.assertEqual(stmt_res.status_code, status.HTTP_200_OK)
        self.assertEqual(stmt_res.data["total_outstanding_minor"], 5_750_000_00)
        self.assertEqual(len(stmt_res.data["ledger"]), 2)  # 1 invoice + 1 payment

    def test_ipc_workflow(self):
        # 1. Certify IPC
        certify_url = reverse(
            "billing:ipcs-action",
            kwargs={"public_id": self.alpha_ipc.public_id, "action": "certify"},
        )
        cert_payload = {
            "version": self.alpha_ipc.version,
            "qs_sign_off_by": "Engr. M. Ibrahim (Lead QS)",
            "reason": "Measured works verified against subsea layout drawing",
        }
        res = self.client.post(certify_url, cert_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.alpha_ipc.refresh_from_db()
        self.assertEqual(self.alpha_ipc.status, InterimPaymentCertificate.Status.QS_CERTIFIED)
        self.assertEqual(self.alpha_ipc.qs_sign_off_by, "Engr. M. Ibrahim (Lead QS)")

        # 2. Approve IPC
        approve_url = reverse(
            "billing:ipcs-action",
            kwargs={"public_id": self.alpha_ipc.public_id, "action": "approve"},
        )
        app_res = self.client.post(approve_url, {"version": self.alpha_ipc.version}, format="json")
        self.assertEqual(app_res.status_code, status.HTTP_200_OK)
        self.alpha_ipc.refresh_from_db()
        self.assertEqual(self.alpha_ipc.status, InterimPaymentCertificate.Status.APPROVED)

    def test_cross_tenant_access_denied(self):
        url = reverse("billing:invoices-detail", kwargs={"public_id": self.bravo_invoice.public_id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        action_url = reverse(
            "billing:invoices-action",
            kwargs={"public_id": self.bravo_invoice.public_id, "action": "issue"},
        )
        res = self.client.post(action_url, {"version": 1}, format="json")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
