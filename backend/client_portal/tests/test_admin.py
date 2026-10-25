from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from client_portal.admin import (
    ClientPortalAccessLogAdmin,
    ClientPortalProfileAdmin,
    SharedDeliverablePackageAdmin,
)
from client_portal.models import (
    ClientPortalAccessLog,
    ClientPortalProfile,
    SharedDeliverablePackage,
)
from organizations.models import Membership, Organization

User = get_user_model()


class MockSuperUser:
    def __init__(self, user):
        self.user = user

    def __getattr__(self, item):
        return getattr(self.user, item)


class ClientPortalAdminTests(TestCase):
    def setUp(self):
        self.site = AdminSite()
        self.factory = RequestFactory()

        self.alpha_user = User.objects.create_user(username="adm-alpha@test.local", email="adm-alpha@test.local", password="password")
        self.bravo_user = User.objects.create_user(username="adm-bravo@test.local", email="adm-bravo@test.local", password="password")

        self.alpha_org = Organization.objects.create(name="Alpha Org Admin", slug="alpha-org-adm")
        self.bravo_org = Organization.objects.create(name="Bravo Org Admin", slug="bravo-org-adm")

        Membership.objects.create(user=self.alpha_user, organization=self.alpha_org, role=Membership.Role.ADMIN)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo_org, role=Membership.Role.ADMIN)

        self.alpha_profile = ClientPortalProfile.objects.create(
            organization=self.alpha_org,
            user=self.alpha_user,
            client_name="Alpha Client",
        )
        self.bravo_profile = ClientPortalProfile.objects.create(
            organization=self.bravo_org,
            user=self.bravo_user,
            client_name="Bravo Client",
        )

        self.alpha_pkg = SharedDeliverablePackage.objects.create(
            organization=self.alpha_org,
            client_name="Alpha Client",
            title="Alpha Deliverable",
            deliverable_type=SharedDeliverablePackage.DeliverableType.BUNKER_BDN,
            source_reference="BDN-001",
            created_by=self.alpha_user,
        )
        self.bravo_pkg = SharedDeliverablePackage.objects.create(
            organization=self.bravo_org,
            client_name="Bravo Client",
            title="Bravo Deliverable",
            deliverable_type=SharedDeliverablePackage.DeliverableType.HAULAGE_POD,
            source_reference="POD-001",
            created_by=self.bravo_user,
        )

    def test_admin_querysets_are_tenant_scoped(self):
        request = self.factory.get("/admin/client_portal/shareddeliverablepackage/")
        request.user = self.alpha_user

        admin_instance = SharedDeliverablePackageAdmin(SharedDeliverablePackage, self.site)
        qs = admin_instance.get_queryset(request)

        self.assertIn(self.alpha_pkg, qs)
        self.assertNotIn(self.bravo_pkg, qs)

    def test_admin_disallows_direct_mutation_permissions(self):
        request = self.factory.get("/admin/client_portal/clientportalprofile/")
        request.user = self.alpha_user

        admin_instance = ClientPortalProfileAdmin(ClientPortalProfile, self.site)
        self.assertFalse(admin_instance.has_add_permission(request))
        self.assertFalse(admin_instance.has_change_permission(request, self.alpha_profile))
        self.assertFalse(admin_instance.has_delete_permission(request, self.alpha_profile))
