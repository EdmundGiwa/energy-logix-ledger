import uuid
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from core.admin import EmailLogAdmin
from core.email import send_transactional_email, send_verification_otp_email
from core.models import EmailLog
from organizations.models import Membership, Organization

User = get_user_model()


class MockSuperUser:
    def __init__(self):
        self.is_active = True
        self.is_staff = True
        self.is_superuser = True


class EmailLogTests(TestCase):
    def setUp(self):
        self.site = AdminSite()
        self.admin = EmailLogAdmin(EmailLog, self.site)
        self.factory = RequestFactory()

        # Tenant A
        self.org_a = Organization.objects.create(name="Delta Marine Corp", slug="delta-marine")
        self.user_a = User.objects.create_user(
            username="user_a",
            email="user_a@deltamarine.com",
            password="StrongPassword123!",
            is_staff=True,
        )
        Membership.objects.create(
            organization=self.org_a,
            user=self.user_a,
            role=Membership.Role.ADMIN,
            is_active=True,
        )

        # Tenant B
        self.org_b = Organization.objects.create(name="Apex Logistics Ltd", slug="apex-logistics")
        self.user_b = User.objects.create_user(
            username="user_b",
            email="user_b@apexlogistics.com",
            password="StrongPassword123!",
            is_staff=True,
        )
        Membership.objects.create(
            organization=self.org_b,
            user=self.user_b,
            role=Membership.Role.ADMIN,
            is_active=True,
        )

    def test_send_transactional_email_creates_email_log(self):
        success = send_transactional_email(
            to="recipient@example.com",
            subject="Welcome to Ofshora",
            html_content="<p>Welcome</p>",
            text_content="Welcome",
            email_type="notification",
        )
        self.assertTrue(success)

        log = EmailLog.objects.filter(recipient_email="recipient@example.com").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.subject, "Welcome to Ofshora")
        self.assertEqual(log.email_type, "notification")
        self.assertEqual(log.status, EmailLog.Status.SENT)
        self.assertEqual(log.provider, "django_test")
        self.assertIsNotNone(log.sent_at)

    def test_send_verification_otp_email_creates_email_log_with_user_and_org(self):
        success = send_verification_otp_email(user=self.user_a, code="123456")
        self.assertTrue(success)

        log = EmailLog.objects.filter(recipient_email=self.user_a.email).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.recipient_user, self.user_a)
        self.assertEqual(log.organization, self.org_a)
        self.assertEqual(log.email_type, "verification_otp")
        self.assertEqual(log.status, EmailLog.Status.SENT)

    def test_email_log_admin_tenant_isolation(self):
        # Create EmailLog for Tenant A
        log_a = EmailLog.objects.create(
            recipient_email="crew@deltamarine.com",
            recipient_user=self.user_a,
            organization=self.org_a,
            subject="Delta Operations",
            email_type=EmailLog.EmailType.NOTIFICATION,
            status=EmailLog.Status.SENT,
        )
        # Create EmailLog for Tenant B
        log_b = EmailLog.objects.create(
            recipient_email="dispatch@apexlogistics.com",
            recipient_user=self.user_b,
            organization=self.org_b,
            subject="Apex Haulage",
            email_type=EmailLog.EmailType.NOTIFICATION,
            status=EmailLog.Status.SENT,
        )

        # Request from Tenant A user
        request_a = self.factory.get("/admin/core/emaillog/")
        request_a.user = self.user_a
        qs_a = self.admin.get_queryset(request_a)
        self.assertIn(log_a, qs_a)
        self.assertNotIn(log_b, qs_a)

        # Request from Tenant B user
        request_b = self.factory.get("/admin/core/emaillog/")
        request_b.user = self.user_b
        qs_b = self.admin.get_queryset(request_b)
        self.assertIn(log_b, qs_b)
        self.assertNotIn(log_a, qs_b)

        # Request from superuser sees all
        request_su = self.factory.get("/admin/core/emaillog/")
        request_su.user = MockSuperUser()
        qs_su = self.admin.get_queryset(request_su)
        self.assertIn(log_a, qs_su)
        self.assertIn(log_b, qs_su)

    def test_email_log_admin_immutability_permissions(self):
        request = self.factory.get("/admin/core/emaillog/")
        request.user = self.user_a

        self.assertFalse(self.admin.has_add_permission(request))
        self.assertFalse(self.admin.has_change_permission(request))
        self.assertFalse(self.admin.has_delete_permission(request))

