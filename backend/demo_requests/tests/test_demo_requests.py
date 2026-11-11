from datetime import datetime, timedelta, timezone as dt_timezone
from unittest import mock

from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.test import RequestFactory, TestCase
from rest_framework.test import APIClient

from demo_requests.admin import DemoRequestAdmin
from demo_requests.models import DemoRequest, DemoRequestEvent
from demo_requests.services import InvalidTransition, transition_demo_request
from organizations.models import Membership, Organization

User = get_user_model()

# Monday 9 Nov 2026, 09:00 in Lagos (WAT = UTC+1).
NOW = datetime(2026, 11, 9, 8, 0, tzinfo=dt_timezone.utc)
# First bookable slot given 12h notice: Tuesday 09:00 WAT.
FIRST_SLOT = datetime(2026, 11, 10, 8, 0, tzinfo=dt_timezone.utc)

CREATE_URL = "/api/v1/demo-requests/"
AVAILABILITY_URL = "/api/v1/demo-requests/availability/"


def payload(**overrides):
    data = {
        "segment": "bunkering_marketing",
        "operations": ["bunkering", "depot_tank_farm"],
        "company_name": "Delta Bunker Services Ltd",
        "company_website": "https://example.com",
        "company_size": "26_100",
        "countries": ["NG", "UG"],
        "pain_points": ["product_loss", "slow_invoicing"],
        "interested_modules": ["bunkerflow", "tankworks", "billing"],
        "current_tools": "paper_excel",
        "full_name": "Ada Obi",
        "work_email": "Ada@Example.com",
        "phone": "+234 803 000 0000",
        "job_title": "Operations Manager",
        "notes": "",
        "scheduled_start": FIRST_SLOT.isoformat(),
        "prospect_timezone": "Africa/Lagos",
        "meeting_format": "google_meet",
        "on_site_location": "",
        "consent_to_contact": True,
    }
    data.update(overrides)
    return data


def make_demo(**overrides):
    fields = {
        "reference": overrides.pop("reference", "OFS-TEST01"),
        "segment": "epc_contractor",
        "company_name": "Acme EPC",
        "company_size": "101_300",
        "countries": ["NG"],
        "interested_modules": ["epclink"],
        "current_tools": "erp",
        "full_name": "Test Person",
        "work_email": "test@example.com",
        "phone": "+2348030000000",
        "job_title": "MD",
        "scheduled_start": FIRST_SLOT,
        "duration_minutes": 45,
        "prospect_timezone": "Africa/Lagos",
        "meeting_format": "zoom",
        "consent_to_contact": True,
    }
    fields.update(overrides)
    return DemoRequest.objects.create(**fields)


@mock.patch("demo_requests.services.timezone.now", return_value=NOW)
class DemoRequestApiTests(TestCase):
    def setUp(self):
        cache.clear()  # throttle counters live in the cache
        self.client = APIClient()

    def post(self, data):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(CREATE_URL, data, format="json")

    def test_availability_lists_weekday_slots_after_notice_period(self, _now):
        response = self.client.get(AVAILABILITY_URL)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["timezone"], "Africa/Lagos")
        self.assertEqual(body["duration_minutes"], 45)
        self.assertEqual(body["slots"][0], "2026-11-10T08:00:00Z")
        days = {datetime.fromisoformat(s.replace("Z", "+00:00")).weekday() for s in body["slots"]}
        self.assertTrue(days <= {0, 1, 2, 3, 4})

    def test_availability_hides_held_slots_but_frees_cancelled_ones(self, _now):
        make_demo(reference="OFS-HELD01", scheduled_start=FIRST_SLOT)
        make_demo(reference="OFS-CANC01", scheduled_start=FIRST_SLOT + timedelta(hours=1), status="cancelled")
        slots = self.client.get(AVAILABILITY_URL).json()["slots"]
        self.assertNotIn("2026-11-10T08:00:00Z", slots)
        self.assertIn("2026-11-10T09:00:00Z", slots)

    def test_booking_creates_request_audit_event_and_two_emails(self, _now):
        response = self.post(payload())
        self.assertEqual(response.status_code, 201, response.content)
        body = response.json()
        self.assertTrue(body["reference"].startswith("OFS-"))
        self.assertEqual(body["status"], "requested")
        self.assertNotIn("work_email", body)
        self.assertNotIn("phone", body)

        demo = DemoRequest.objects.get(reference=body["reference"])
        self.assertEqual(demo.work_email, "ada@example.com")
        self.assertEqual(demo.scheduled_start, FIRST_SLOT)
        self.assertEqual(demo.duration_minutes, 45)
        event = demo.events.get()
        self.assertEqual((event.from_status, event.to_status, event.actor), ("", "requested", None))

        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(mail.outbox[0].to, ["ada@example.com"])
        self.assertIn(demo.reference, mail.outbox[0].subject)
        self.assertEqual(mail.outbox[1].to, ["support@ofshora.com"])
        self.assertEqual(mail.outbox[1].reply_to, ["ada@example.com"])

    def test_prospect_text_is_escaped_in_emails(self, _now):
        self.post(payload(company_name="<script>alert(1)</script> Ltd", notes="<img src=x onerror=y>"))
        for message in mail.outbox:
            html = message.alternatives[0][0]
            self.assertNotIn("<script>alert(1)</script>", html)
            self.assertNotIn("<img src=x", html)
        self.assertIn("&lt;script&gt;", mail.outbox[1].alternatives[0][0])

    def test_rejects_times_that_are_not_offered(self, _now):
        for start in (
            FIRST_SLOT + timedelta(minutes=30),  # off the slot grid
            NOW + timedelta(hours=1),  # inside the notice period
            datetime(2026, 11, 14, 8, 0, tzinfo=dt_timezone.utc),  # Saturday
            FIRST_SLOT + timedelta(days=60),  # beyond the horizon
        ):
            response = self.post(payload(scheduled_start=start.isoformat()))
            self.assertEqual(response.status_code, 409, start)
        self.assertFalse(DemoRequest.objects.exists())

    def test_second_prospect_cannot_take_a_held_slot(self, _now):
        self.assertEqual(self.post(payload()).status_code, 201)
        response = self.post(payload(work_email="someone.else@example.com"))
        self.assertEqual(response.status_code, 409)
        self.assertEqual(DemoRequest.objects.count(), 1)

    def test_resubmitting_same_booking_is_a_safe_retry(self, _now):
        first = self.post(payload()).json()
        mail.outbox.clear()
        retry = self.post(payload(work_email="ADA@example.com"))
        self.assertEqual(retry.status_code, 200)
        self.assertEqual(retry.json()["reference"], first["reference"])
        self.assertEqual(DemoRequest.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 0)

    def test_validation_errors(self, _now):
        cases = {
            "consent_to_contact": payload(consent_to_contact=False),
            "interested_modules": payload(interested_modules=["bunkerflow", "not_a_module"]),
            "countries": payload(countries=[]),
            "segment": payload(segment="crypto"),
            "prospect_timezone": payload(prospect_timezone="Mars/Olympus"),
            "phone": payload(phone="call me"),
            "on_site_location": payload(meeting_format="on_site", on_site_location=""),
        }
        for field, data in cases.items():
            cache.clear()  # keep the 5/hour throttle out of this test
            response = self.post(data)
            self.assertEqual(response.status_code, 400, field)
            self.assertIn(field, response.json(), field)
        self.assertFalse(DemoRequest.objects.exists())

    def test_on_site_location_is_kept_only_for_on_site_meetings(self, _now):
        self.post(payload(meeting_format="zoom", on_site_location="Port Harcourt"))
        self.assertEqual(DemoRequest.objects.get().on_site_location, "")

    def test_csrf_is_enforced(self, _now):
        client = APIClient(enforce_csrf_checks=True)
        response = client.post(CREATE_URL, payload(), format="json")
        self.assertEqual(response.status_code, 403)
        self.assertFalse(DemoRequest.objects.exists())


class DemoRequestRulesTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_user(username="sales", email="sales@example.com", password="x", is_staff=True)

    def test_database_rejects_two_active_requests_for_one_slot(self):
        make_demo(reference="OFS-AAAAAA")
        with self.assertRaises(IntegrityError), transaction.atomic():
            make_demo(reference="OFS-BBBBBB", work_email="other@example.com")

    def test_database_requires_consent(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            make_demo(consent_to_contact=False)

    def test_transitions_are_validated_and_audited(self):
        demo = make_demo()
        transition_demo_request(demo_request=demo, to_status="confirmed", actor=self.staff, reason="Link sent")
        demo.refresh_from_db()
        self.assertEqual(demo.status, "confirmed")
        event = demo.events.get()
        self.assertEqual((event.from_status, event.to_status, event.actor), ("requested", "confirmed", self.staff))

        # Same status again is a no-op, not a second audit row.
        transition_demo_request(demo_request=demo, to_status="confirmed", actor=self.staff)
        self.assertEqual(demo.events.count(), 1)

        transition_demo_request(demo_request=demo, to_status="completed", actor=self.staff)
        with self.assertRaises(InvalidTransition):
            transition_demo_request(demo_request=demo, to_status="requested", actor=self.staff)
        demo.refresh_from_db()
        self.assertEqual(demo.status, "completed")


class DemoRequestAdminTests(TestCase):
    def setUp(self):
        self.admin = DemoRequestAdmin(DemoRequest, AdminSite())
        self.factory = RequestFactory()
        self.superuser = User.objects.create_superuser(username="root", email="root@example.com", password="x")
        # A tenant admin: staff, with an organization membership, but not platform staff.
        self.tenant_admin = User.objects.create_user(
            username="tenant", email="tenant@example.com", password="x", is_staff=True
        )
        org = Organization.objects.create(name="Tenant Co", slug="tenant-co")
        Membership.objects.create(organization=org, user=self.tenant_admin, role=Membership.Role.ADMIN, is_active=True)
        self.demo = make_demo()

    def request_for(self, user):
        request = self.factory.get("/admin/demo_requests/demorequest/")
        request.user = user
        request._messages = mock.MagicMock()
        return request

    def test_tenant_admins_cannot_see_prospects(self):
        request = self.request_for(self.tenant_admin)
        self.assertFalse(self.admin.has_module_permission(request))
        self.assertFalse(self.admin.has_view_permission(request))
        self.assertFalse(self.admin.has_change_permission(request))
        self.assertFalse(self.admin.has_delete_permission(request))
        self.assertEqual(self.admin.get_queryset(request).count(), 0)

    def test_superuser_sees_requests_but_cannot_edit_submitted_fields(self):
        request = self.request_for(self.superuser)
        self.assertEqual(list(self.admin.get_queryset(request)), [self.demo])
        self.assertFalse(self.admin.has_add_permission(request))
        readonly = set(self.admin.get_readonly_fields(request, self.demo))
        for field in ("status", "work_email", "scheduled_start", "interested_modules", "reference"):
            self.assertIn(field, readonly)

    def test_admin_actions_use_the_service_and_record_actor(self):
        request = self.request_for(self.superuser)
        actions = self.admin.get_actions(request)
        confirm = actions["mark_confirmed"][0]
        confirm(self.admin, request, DemoRequest.objects.filter(pk=self.demo.pk))
        self.demo.refresh_from_db()
        self.assertEqual(self.demo.status, "confirmed")
        self.assertEqual(DemoRequestEvent.objects.get().actor, self.superuser)

        # Invalid transition is refused, not forced.
        actions["mark_cancelled"][0](self.admin, request, DemoRequest.objects.filter(pk=self.demo.pk))
        actions["mark_confirmed"][0](self.admin, request, DemoRequest.objects.filter(pk=self.demo.pk))
        self.demo.refresh_from_db()
        self.assertEqual(self.demo.status, "cancelled")
