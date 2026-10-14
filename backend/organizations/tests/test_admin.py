from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from organizations.admin import MembershipAdmin, OrganizationAdmin
from organizations.models import Membership, Organization


User = get_user_model()


class TenantAdminTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.staff = User.objects.create_user(
            username="staff@example.com",
            email="staff@example.com",
            password="password",
            is_staff=True,
        )
        self.other = User.objects.create_user(username="other@example.com", email="other@example.com", password="password")
        self.own_organization = Organization.objects.create(name="Own Tenant", slug="own-tenant")
        self.other_organization = Organization.objects.create(name="Other Tenant", slug="other-tenant")
        self.own_membership = Membership.objects.create(
            user=self.staff,
            organization=self.own_organization,
            role=Membership.Role.OWNER,
        )
        self.other_membership = Membership.objects.create(
            user=self.other,
            organization=self.other_organization,
            role=Membership.Role.OWNER,
        )
        self.request = self.factory.get("/admin/")
        self.request.user = self.staff

    def test_organization_admin_queryset_is_tenant_scoped(self):
        model_admin = OrganizationAdmin(Organization, admin.site)
        self.assertEqual(list(model_admin.get_queryset(self.request)), [self.own_organization])

    def test_membership_admin_queryset_is_tenant_scoped(self):
        model_admin = MembershipAdmin(Membership, admin.site)
        self.assertEqual(list(model_admin.get_queryset(self.request)), [self.own_membership])

    def test_admin_configuration_supports_operational_lookup(self):
        organization_admin = OrganizationAdmin(Organization, admin.site)
        membership_admin = MembershipAdmin(Membership, admin.site)
        self.assertIn("status", organization_admin.list_filter)
        self.assertIn("name", organization_admin.search_fields)
        self.assertIn("role", membership_admin.list_filter)
        self.assertIn("user__email", membership_admin.search_fields)
        self.assertIn("public_id", membership_admin.readonly_fields)

    def test_non_superuser_cannot_delete_tenant_records(self):
        organization_admin = OrganizationAdmin(Organization, admin.site)
        membership_admin = MembershipAdmin(Membership, admin.site)
        self.assertFalse(organization_admin.has_delete_permission(self.request, self.own_organization))
        self.assertFalse(membership_admin.has_delete_permission(self.request, self.own_membership))
        self.assertFalse(organization_admin.has_change_permission(self.request, self.own_organization))
        self.assertFalse(membership_admin.has_change_permission(self.request, self.own_membership))
