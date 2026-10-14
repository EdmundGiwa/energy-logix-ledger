from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from organizations.models import Membership, Organization


User = get_user_model()


class TenantIsolationTests(APITestCase):
    def setUp(self):
        self.first_user = User.objects.create_user(username="first@example.com", email="first@example.com", password="password")
        self.second_user = User.objects.create_user(username="second@example.com", email="second@example.com", password="password")
        self.first_organization = Organization.objects.create(name="First Tenant", slug="first-tenant")
        self.second_organization = Organization.objects.create(name="Second Tenant", slug="second-tenant")
        self.first_membership = Membership.objects.create(
            user=self.first_user,
            organization=self.first_organization,
            role=Membership.Role.OWNER,
        )
        self.second_membership = Membership.objects.create(
            user=self.second_user,
            organization=self.second_organization,
            role=Membership.Role.OWNER,
        )
        self.client.force_login(self.first_user)

    def test_member_list_is_scoped_to_authenticated_membership(self):
        response = self.client.get(reverse("current-organization-members"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {item["id"] for item in response.data}
        self.assertEqual(returned_ids, {str(self.first_membership.public_id)})
        self.assertNotIn(str(self.second_membership.public_id), returned_ids)

    def test_client_supplied_other_tenant_id_is_denied(self):
        response = self.client.get(
            reverse("current-organization-members"),
            HTTP_X_ORGANIZATION_ID=str(self.second_organization.public_id),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cross_tenant_write_update_and_delete_attempts_are_denied(self):
        url = reverse("current-organization-members")
        headers = {"HTTP_X_ORGANIZATION_ID": str(self.second_organization.public_id)}
        for method in ("post", "put", "patch", "delete"):
            response = getattr(self.client, method)(url, {"role": Membership.Role.ADMIN}, format="json", **headers)
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, method)
        self.second_membership.refresh_from_db()
        self.assertEqual(self.second_membership.role, Membership.Role.OWNER)

    def test_search_cannot_cross_tenant_boundary(self):
        response = self.client.get(reverse("current-organization-members"), {"search": "second@example.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_multiple_memberships_require_explicit_verified_context(self):
        second_membership_for_first_user = Membership.objects.create(
            user=self.first_user,
            organization=self.second_organization,
            role=Membership.Role.VIEWER,
        )
        response = self.client.get(reverse("current-organization-members"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.get(
            reverse("current-organization-members"),
            HTTP_X_ORGANIZATION_ID=str(self.second_organization.public_id),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {item["id"] for item in response.data}
        self.assertIn(str(second_membership_for_first_user.public_id), returned_ids)
        self.assertIn(str(self.second_membership.public_id), returned_ids)
        self.assertNotIn(str(self.first_membership.public_id), returned_ids)
