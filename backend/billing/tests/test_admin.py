from datetime import date
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from billing.admin import (
    CommercialInvoiceAdmin,
    CustomerAccountAdmin,
    InterimPaymentCertificateAdmin,
)
from billing.models import (
    CommercialInvoice,
    Currency,
    CustomerAccount,
    InterimPaymentCertificate,
)
from organizations.models import Membership, Organization

User = get_user_model()


class MockSuperUser:
    def __init__(self, user):
        self.user = user

    def __getattr__(self, item):
        return getattr(self.user, item)

    @property
    def is_superuser(self):
        return True


class BillingAdminTests(TestCase):
    def setUp(self):
        self.site = AdminSite()
        self.factory = RequestFactory()

        self.alpha_user = User.objects.create_user(username="admin-billing-alpha@test.local", email="admin-billing-alpha@test.local")
        self.bravo_user = User.objects.create_user(username="admin-billing-bravo@test.local", email="admin-billing-bravo@test.local")
        self.alpha_org = Organization.objects.create(name="Alpha Billing Org", slug="alpha-billing-org")
        self.bravo_org = Organization.objects.create(name="Bravo Billing Org", slug="bravo-billing-org")
        Membership.objects.create(user=self.alpha_user, organization=self.alpha_org, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo_org, role=Membership.Role.OWNER)

        self.alpha_customer = CustomerAccount.objects.create(
            organization=self.alpha_org,
            customer_code="CUST-ADM-01",
            name="Alpha Customer",
            currency=Currency.NGN,
        )

        self.bravo_customer = CustomerAccount.objects.create(
            organization=self.bravo_org,
            customer_code="CUST-ADM-02",
            name="Bravo Customer",
            currency=Currency.USD,
        )

    def test_customer_admin_queryset_scoped_to_tenant(self):
        admin = CustomerAccountAdmin(CustomerAccount, self.site)
        req = self.factory.get("/admin/billing/customeraccount/")
        req.user = self.alpha_user

        qs = admin.get_queryset(req)
        self.assertIn(self.alpha_customer, qs)
        self.assertNotIn(self.bravo_customer, qs)

    def test_customer_admin_superuser_sees_all(self):
        admin = CustomerAccountAdmin(CustomerAccount, self.site)
        req = self.factory.get("/admin/billing/customeraccount/")
        req.user = MockSuperUser(self.alpha_user)

        qs = admin.get_queryset(req)
        self.assertIn(self.alpha_customer, qs)
        self.assertIn(self.bravo_customer, qs)

    def test_customer_admin_permissions_read_only(self):
        admin = CustomerAccountAdmin(CustomerAccount, self.site)
        req = self.factory.get("/admin/billing/customeraccount/")
        req.user = self.alpha_user

        self.assertFalse(admin.has_add_permission(req))
        self.assertFalse(admin.has_change_permission(req))
        self.assertFalse(admin.has_delete_permission(req))
