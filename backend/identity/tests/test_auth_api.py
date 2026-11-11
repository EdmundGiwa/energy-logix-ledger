from datetime import timedelta
from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from identity.models import AuthenticationEvent, EmailVerificationCode, PasswordResetToken
from identity.services import create_and_send_email_verification_otp, hash_secret
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

    def test_public_registration_is_closed(self):
        """Accounts are invite-only: Offshora staff provision customers after a demo."""
        client = self.csrf_client()
        response = client.post("/api/v1/auth/register/", self.registration_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(User.objects.filter(email="ada@example.com").exists())
        self.assertEqual(Organization.objects.count(), 0)

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
        old_session = client.cookies["offshora_session"].value
        self.refresh_csrf_header(client)
        self.assertEqual(client.post(reverse("auth-session-refresh"), format="json").status_code, status.HTTP_200_OK)
        self.assertNotEqual(client.cookies["offshora_session"].value, old_session)
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

    def test_email_verification_flow(self):
        user = User.objects.create_user(username="verify@example.com", email="verify@example.com", password="Strong-pass-2026!")
        otp = create_and_send_email_verification_otp(user)

        client = self.csrf_client()
        client.force_login(user)

        # 1. Invalid attempt
        res_fail = client.post(reverse("auth-verify-email-confirm"), {"code": "000000"}, format="json")
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)
        user.refresh_from_db()
        self.assertFalse(user.is_email_verified)

        # 2. Valid attempt
        self.refresh_csrf_header(client)
        res_ok = client.post(reverse("auth-verify-email-confirm"), {"code": otp}, format="json")
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        self.assertTrue(res_ok.data["is_email_verified"])

        user.refresh_from_db()
        self.assertTrue(user.is_email_verified)
        self.assertIsNotNone(user.email_verified_at)

        # 3. Code cannot be reused
        self.refresh_csrf_header(client)
        res_reuse = client.post(reverse("auth-verify-email-confirm"), {"code": otp}, format="json")
        self.assertEqual(res_reuse.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_reset_flow(self):
        user = User.objects.create_user(username="reset@example.com", email="reset@example.com", password="Old-password-2026!")
        client = self.csrf_client()

        # 1. Request reset
        req_res = client.post(reverse("auth-password-reset-request"), {"email": "RESET@example.com"}, format="json")
        self.assertEqual(req_res.status_code, status.HTTP_200_OK)

        token_record = PasswordResetToken.objects.filter(user=user, is_used=False).first()
        self.assertIsNotNone(token_record)

        # 2. Confirm reset with token
        raw_token = "valid-test-token-12345678"
        token_record.token_hash = hash_secret(raw_token)
        token_record.save(update_fields=["token_hash"])

        self.refresh_csrf_header(client)
        confirm_res = client.post(
            reverse("auth-password-reset-confirm"),
            {"token": raw_token, "password": "BrandNew-Password-2026!"},
            format="json",
        )
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)

        user.refresh_from_db()
        self.assertTrue(user.check_password("BrandNew-Password-2026!"))
        self.assertFalse(user.check_password("Old-password-2026!"))
        self.assertTrue(PasswordResetToken.objects.get(pk=token_record.pk).is_used)

    def test_password_reset_request_is_generic_for_unknown_user(self):
        client = self.csrf_client()
        response = client.post(reverse("auth-password-reset-request"), {"email": "doesnotexist@example.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("password reset link has been dispatched", response.data["detail"])
