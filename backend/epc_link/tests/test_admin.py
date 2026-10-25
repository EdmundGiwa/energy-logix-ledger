from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from epc_link.admin import (
    ApprovedVendorAdmin,
    MaterialIssueSlipAdmin,
    MaterialRequisitionAdmin,
    PipeYardItemAdmin,
)
from epc_link.models import (
    ApprovedVendor,
    MaterialRequisition,
    PipeYardItem,
)
from organizations.models import Membership, Organization

User = get_user_model()


class MockSuperUser:
    is_active = True
    is_staff = True
    is_superuser = True

    def has_perm(self, perm, obj=None):
        return True


class EpcLinkAdminTests(TestCase):
    def setUp(self):
        self.site = AdminSite()
        self.factory = RequestFactory()
        self.alpha_user = User.objects.create_user(username="admin-epc-alpha@test.local", email="admin-epc-alpha@test.local", password="password")
        self.bravo_user = User.objects.create_user(username="admin-epc-bravo@test.local", email="admin-epc-bravo@test.local", password="password")
        self.alpha = Organization.objects.create(name="Alpha EPC Admin Org", slug="alpha-epc-admin")
        self.bravo = Organization.objects.create(name="Bravo EPC Admin Org", slug="bravo-epc-admin")
        Membership.objects.create(user=self.alpha_user, organization=self.alpha, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo, role=Membership.Role.OWNER)

        self.alpha_vendor = ApprovedVendor.objects.create(
            organization=self.alpha,
            vendor_code="VND-A1",
            vendor_name="Alpha Mill Vendor",
            category=ApprovedVendor.Category.TUBULARS,
        )
        self.bravo_vendor = ApprovedVendor.objects.create(
            organization=self.bravo,
            vendor_code="VND-B1",
            vendor_name="Bravo Mill Vendor",
            category=ApprovedVendor.Category.VALVES,
        )

    def test_admin_queryset_scoped_to_user_organization(self):
        vendor_admin = ApprovedVendorAdmin(ApprovedVendor, self.site)
        req = self.factory.get("/admin/epc_link/approvedvendor/")
        req.user = self.alpha_user

        qs = vendor_admin.get_queryset(req)
        self.assertIn(self.alpha_vendor, qs)
        self.assertNotIn(self.bravo_vendor, qs)

    def test_superuser_sees_all_vendors(self):
        vendor_admin = ApprovedVendorAdmin(ApprovedVendor, self.site)
        req = self.factory.get("/admin/epc_link/approvedvendor/")
        req.user = MockSuperUser()

        qs = vendor_admin.get_queryset(req)
        self.assertIn(self.alpha_vendor, qs)
        self.assertIn(self.bravo_vendor, qs)
