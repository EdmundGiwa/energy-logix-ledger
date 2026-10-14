from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from identity.models import AuthenticationEvent
from organizations.models import Membership, Organization


User = get_user_model()


class AuthenticationApiTests(APITestCase):
    registration_payload = {
        "first_name": "Ada",
        "last_name": "Okafor",
        "email": "ada@example.com",
        "password": "Strong-pass-2026!",
        "organization_name": "Delta Energy Services",
        "job_title": "Operations Manager",
        "requested_plan": "starter",
        "terms_accepted": True,
    }

    def csrf_client(self):
        client = APIClient(enforce_csrf_checks=True)
        response = client.get(reverse("auth-csrf"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        token = response.data["csrf_token"]
        client.credentials(HTTP_X_CSRFTOKEN=token)
        return client

    def refresh_csrf_header(self, client):
        response = client.get(reverse("auth-csrf"))
        client.credentials(HTTP_X_CSRFTOKEN=response.data["csrf_token"])

    def test_registration_atomically_creates_owner_and_session(self):
        client = self.csrf_client()

        response = client.post(reverse("auth-register"), self.registration_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="ada@example.com")
        organization = Organization.objects.get(name="Delta Energy Services")
        membership = Membership.objects.get(user=user, organization=organization)
        self.assertEqual(membership.role, Membership.Role.OWNER)
        self.assertNotEqual(membership.role, self.registration_payload["job_title"])
        self.assertTrue(AuthenticationEvent.objects.filter(user=user, event_type="register", outcome="success").exists())
        self.assertEqual(client.get(reverse("auth-me")).status_code, status.HTTP_200_OK)

    def test_registration_requires_csrf_and_terms(self):
        no_csrf = APIClient(enforce_csrf_checks=True)
        self.assertEqual(no_csrf.post(reverse("auth-register"), self.registration_payload, format="json").status_code, status.HTTP_403_FORBIDDEN)

        client = self.csrf_client()
        payload = {**self.registration_payload, "terms_accepted": False}
        response = client.post(reverse("auth-register"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 0)
        self.assertEqual(Organization.objects.count(), 0)

    def test_duplicate_email_does_not_create_second_organization(self):
        client = self.csrf_client()
        self.assertEqual(client.post(reverse("auth-register"), self.registration_payload, format="json").status_code, status.HTTP_201_CREATED)
        self.refresh_csrf_header(client)
        client.post(reverse("auth-logout"), format="json")
        self.refresh_csrf_header(client)
        response = client.post(
            reverse("auth-register"),
            {**self.registration_payload, "organization_name": "Another Company"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Organization.objects.count(), 1)

    def test_login_refresh_current_user_and_logout(self):
        user = User.objects.create_user(username="owner@example.com", email="owner@example.com", password="Strong-pass-2026!")
        organization = Organization.objects.create(name="Tenant One", slug="tenant-one")
        Membership.objects.create(user=user, organization=organization, role=Membership.Role.OWNER)
        client = self.csrf_client()

        login_response = client.post(
            reverse("auth-login"),
            {"email": "OWNER@example.com", "password": "Strong-pass-2026!", "remember_me": True},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertEqual(login_response.data["email"], "owner@example.com")
        self.assertEqual(client.get(reverse("auth-me")).status_code, status.HTTP_200_OK)
        old_session = client.cookies["petroledger_session"].value
        self.refresh_csrf_header(client)
        self.assertEqual(client.post(reverse("auth-session-refresh"), format="json").status_code, status.HTTP_200_OK)
        self.assertNotEqual(client.cookies["petroledger_session"].value, old_session)
        self.refresh_csrf_header(client)
        self.assertEqual(client.post(reverse("auth-logout"), format="json").status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(client.get(reverse("auth-me")).status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_login_is_generic_and_audited(self):
        client = self.csrf_client()
        response = client.post(
            reverse("auth-login"),
            {"email": "missing@example.com", "password": "wrong password"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("non_field_errors", response.data)
        self.assertTrue(AuthenticationEvent.objects.filter(event_type="login", outcome="failure").exists())
