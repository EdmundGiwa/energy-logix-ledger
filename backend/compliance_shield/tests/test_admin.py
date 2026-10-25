from datetime import date, timedelta
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from compliance_shield.admin import (
    IsoManagementSystemAuditAdmin,
    RegulatoryCertificateAdmin,
)
from compliance_shield.models import (
    IsoManagementSystemAudit,
    RegulatoryCertificate,
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


class ComplianceShieldAdminTests(TestCase):
    def setUp(self):
        self.site = AdminSite()
        self.factory = RequestFactory()

        self.alpha_user = User.objects.create_user(username="admin-alpha@test.local", email="admin-alpha@test.local")
        self.bravo_user = User.objects.create_user(username="admin-bravo@test.local", email="admin-bravo@test.local")
        self.alpha_org = Organization.objects.create(name="Alpha Shield Org", slug="alpha-shield")
        self.bravo_org = Organization.objects.create(name="Bravo Shield Org", slug="bravo-shield")
        Membership.objects.create(user=self.alpha_user, organization=self.alpha_org, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo_org, role=Membership.Role.OWNER)

        today = date.today()
        self.alpha_cert = RegulatoryCertificate.objects.create(
            organization=self.alpha_org,
            regulator=RegulatoryCertificate.Regulator.NUPRC,
            certificate_type="Survey Permit",
            certificate_number="NUPRC-ADM-01",
            issuing_authority="NUPRC",
            issue_date=today - timedelta(days=50),
            expiry_date=today + timedelta(days=100),
        )

        self.bravo_cert = RegulatoryCertificate.objects.create(
            organization=self.bravo_org,
            regulator=RegulatoryCertificate.Regulator.NIMASA,
            certificate_type="Cabotage Permit",
            certificate_number="NIMASA-ADM-02",
            issuing_authority="NIMASA",
            issue_date=today - timedelta(days=20),
            expiry_date=today + timedelta(days=200),
        )

    def test_regulatory_certificate_admin_queryset_scoped_to_tenant(self):
        admin = RegulatoryCertificateAdmin(RegulatoryCertificate, self.site)
        req = self.factory.get("/admin/compliance_shield/regulatorycertificate/")
        req.user = self.alpha_user

        qs = admin.get_queryset(req)
        self.assertIn(self.alpha_cert, qs)
        self.assertNotIn(self.bravo_cert, qs)

    def test_regulatory_certificate_admin_superuser_sees_all(self):
        admin = RegulatoryCertificateAdmin(RegulatoryCertificate, self.site)
        req = self.factory.get("/admin/compliance_shield/regulatorycertificate/")
        req.user = MockSuperUser(self.alpha_user)

        qs = admin.get_queryset(req)
        self.assertIn(self.alpha_cert, qs)
        self.assertIn(self.bravo_cert, qs)

    def test_regulatory_certificate_admin_permissions_read_only(self):
        admin = RegulatoryCertificateAdmin(RegulatoryCertificate, self.site)
        req = self.factory.get("/admin/compliance_shield/regulatorycertificate/")
        req.user = self.alpha_user

        self.assertFalse(admin.has_add_permission(req))
        self.assertFalse(admin.has_change_permission(req))
        self.assertFalse(admin.has_delete_permission(req))
