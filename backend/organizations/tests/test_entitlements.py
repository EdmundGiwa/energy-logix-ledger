import re
import uuid
from datetime import datetime, timezone as dt_timezone

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.db import DatabaseError, connection, transaction
from django.test import TestCase
from django.urls import URLPattern, URLResolver, get_resolver
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.test import APIClient

from demo_requests.models import DemoRequest
from identity.models import PasswordResetToken
from organizations.models import (
    Membership,
    ModuleAccessRequest,
    ModuleEntitlementEvent,
    Organization,
    OrganizationModule,
)
from organizations.modules import CORE_MODULES, MODULE_APPS, PLATFORM_APPS
from organizations.services import (
    enabled_modules,
    provision_customer,
    request_module_access,
    resolve_module_request,
    set_organization_modules,
)
from organizations.testing import enable_modules

User = get_user_model()

_CONVERTER_VALUES = {"uuid": str(uuid.uuid4()), "int": "1", "slug": "x", "str": "x", "path": "x"}


def api_routes():
    """(app_label, concrete path) for every URL served under /api/v1/."""
    routes = []

    def walk(patterns, prefix):
        for entry in patterns:
            if isinstance(entry, URLResolver):
                walk(entry.url_patterns, prefix + str(entry.pattern))
            elif isinstance(entry, URLPattern):
                raw = prefix + str(entry.pattern)
                if not raw.startswith("api/v1/"):
                    continue
                path = re.sub(r"<(?:(\w+):)?\w+>", lambda m: _CONVERTER_VALUES.get(m.group(1) or "str", "x"), raw)
                view = getattr(entry.callback, "view_class", None) or getattr(entry.callback, "cls", None) or entry.callback
                routes.append((view.__module__.split(".")[0], "/" + path))

    walk(get_resolver().url_patterns, "")
    return routes


def member(email, organization, role=Membership.Role.OWNER):
    user = User.objects.create_user(username=email, email=email, password="Strong-pass-2026!")
    Membership.objects.create(user=user, organization=organization, role=role)
    return user


class ModuleAccessTests(TestCase):
    def setUp(self):
        cache.clear()
        self.alpha = Organization.objects.create(name="Alpha Energy", slug="alpha")
        self.bravo = Organization.objects.create(name="Bravo Energy", slug="bravo")
        self.alpha_owner = member("owner@alpha.example", self.alpha)
        self.client = APIClient()
        self.client.force_login(self.alpha_owner)

    def test_every_api_route_belongs_to_a_classified_app(self):
        unclassified = {app for app, _ in api_routes()} - set(MODULE_APPS) - PLATFORM_APPS
        self.assertEqual(unclassified, set(), "Classify new apps in organizations/modules.py")

    def test_every_optional_module_endpoint_refuses_unentitled_organizations(self):
        checked = 0
        for app, path in api_routes():
            module = MODULE_APPS.get(app)
            if module is None or module in CORE_MODULES:
                continue
            for method in ("get", "post"):
                response = getattr(self.client, method)(path, {}, format="json")
                if response.status_code == 405:
                    continue
                self.assertEqual(response.status_code, 403, f"{method.upper()} {path} -> {response.status_code}")
                self.assertEqual(response.json().get("detail", "")[:5] != "", True)
                checked += 1
        self.assertGreater(checked, 50)

    def test_enabled_module_and_core_modules_are_reachable(self):
        enable_modules(self.alpha, modules=["bunkerflow"])
        self.assertEqual(self.client.get("/api/v1/bunkerflow/nominations/").status_code, 200)
        # Core modules need no entitlement row.
        self.assertEqual(self.client.get("/api/v1/billing/customers/").status_code, 200)
        # Another tenant's entitlement never leaks.
        enable_modules(self.bravo, modules=["haultrac"])
        self.assertEqual(self.client.get("/api/v1/haultrac/fleets/").status_code, 403)

    def test_current_user_lists_enabled_modules(self):
        enable_modules(self.alpha, modules=["safepass"])
        org = self.client.get("/api/v1/auth/me/").json()["memberships"][0]["organization"]
        self.assertEqual(org["enabled_modules"], sorted(CORE_MODULES | {"safepass"}))


class ModuleRequestTests(TestCase):
    def setUp(self):
        cache.clear()
        self.org = Organization.objects.create(name="Alpha Energy", slug="alpha")
        self.owner = member("owner@alpha.example", self.org)
        self.viewer = member("viewer@alpha.example", self.org, role=Membership.Role.VIEWER)
        self.staff = User.objects.create_superuser(username="staff", email="staff@offshora.example", password="x")
        self.client = APIClient()
        self.client.force_login(self.owner)

    def post(self, data):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post("/api/v1/organizations/current/module-requests/", data, format="json")

    def test_owner_requests_once_and_sales_is_emailed(self):
        first = self.post({"module": "haultrac", "message": "We run 14 trucks"})
        self.assertEqual(first.status_code, 201)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("HaulTrac", mail.outbox[0].subject)
        again = self.post({"module": "haultrac"})
        self.assertEqual(again.status_code, 200)
        self.assertEqual(again.json()["id"], first.json()["id"])
        listing = self.client.get("/api/v1/organizations/current/module-requests/").json()
        self.assertEqual([r["module"] for r in listing], ["haultrac"])

    def test_viewers_and_enabled_modules_are_refused(self):
        self.client.force_login(self.viewer)
        self.assertEqual(self.post({"module": "haultrac"}).status_code, 403)
        self.client.force_login(self.owner)
        self.assertEqual(self.post({"module": "billing"}).status_code, 400)  # core, already on
        self.assertEqual(self.post({"module": "nope"}).status_code, 400)

    def test_approval_switches_module_on_and_is_audited(self):
        membership = self.owner.memberships.get()
        req = request_module_access(membership=membership, module="pipeintegrity").access_request
        resolved = resolve_module_request(access_request=req, approve=True, actor=self.staff)
        self.assertEqual(resolved.status, ModuleAccessRequest.Status.APPROVED)
        self.assertIn("pipeintegrity", enabled_modules(self.org))
        event = ModuleEntitlementEvent.objects.get(organization=self.org, module="pipeintegrity")
        self.assertEqual((event.action, event.actor), ("enabled", self.staff))

    def test_only_platform_admins_change_modules(self):
        with self.assertRaises(PermissionDenied):
            set_organization_modules(organization=self.org, modules=["haultrac"], actor=self.owner)
        set_organization_modules(organization=self.org, modules=["haultrac", "billing"], actor=self.staff, reason="Contract 12")
        self.assertEqual(enabled_modules(self.org), CORE_MODULES | {"haultrac"})
        set_organization_modules(organization=self.org, modules=[], actor=self.staff)
        self.assertEqual(enabled_modules(self.org), CORE_MODULES)
        self.assertEqual(
            list(ModuleEntitlementEvent.objects.filter(organization=self.org).order_by("id").values_list("action", flat=True)),
            ["enabled", "disabled"],
        )


class ProvisioningTests(TestCase):
    def setUp(self):
        cache.clear()
        self.staff = User.objects.create_superuser(username="staff", email="staff@offshora.example", password="x")
        self.demo = DemoRequest.objects.create(
            reference="OFS-PROV01",
            segment="bunkering_marketing",
            company_name="Delta Bunker Services Ltd",
            company_size="26_100",
            countries=["NG"],
            interested_modules=["bunkerflow", "billing"],
            current_tools="paper_excel",
            full_name="Ada Obi",
            work_email="ada@delta.example",
            phone="+2348030000000",
            job_title="Operations Manager",
            scheduled_start=datetime(2026, 11, 10, 8, tzinfo=dt_timezone.utc),
            duration_minutes=45,
            prospect_timezone="Africa/Lagos",
            meeting_format="zoom",
            consent_to_contact=True,
        )

    def provision(self, **overrides):
        args = dict(
            actor=self.staff,
            organization_name="Delta Bunker Services Ltd",
            owner_email="Ada@Delta.example",
            owner_first_name="Ada",
            owner_last_name="Obi",
            owner_job_title="Operations Manager",
            plan="starter",
            modules=["bunkerflow", "haultrac"],
            demo_request=self.demo,
        )
        args.update(overrides)
        with self.captureOnCommitCallbacks(execute=True):
            return provision_customer(**args)

    def test_provision_invite_accept_and_sign_in(self):
        result = self.provision()
        org, owner = result.organization, result.owner
        self.assertFalse(owner.has_usable_password())
        self.assertEqual(owner.memberships.get().role, Membership.Role.OWNER)
        self.assertEqual(enabled_modules(org), CORE_MODULES | {"bunkerflow", "haultrac"})
        self.demo.refresh_from_db()
        self.assertEqual(self.demo.converted_organization, org)

        invite = mail.outbox[-1]
        self.assertEqual(invite.to, ["ada@delta.example"])
        self.assertIn("workspace for Delta Bunker Services Ltd", invite.subject)
        token = re.search(r"token=([\w-]+)&invite=1", invite.body).group(1)
        self.assertEqual(PasswordResetToken.objects.get(user=owner, is_used=False).purpose, "invite")

        client = APIClient()
        mail.outbox.clear()
        response = client.post("/api/v1/auth/password-reset/confirm/", {"token": token, "password": "Brand-new-pass-2026!"}, format="json")
        self.assertEqual(response.status_code, 200, response.content)
        owner.refresh_from_db()
        self.assertTrue(owner.is_email_verified)
        self.assertEqual(mail.outbox, [], "No 'password changed' alert for a first-time invite")
        # The link is single-use.
        reuse = client.post("/api/v1/auth/password-reset/confirm/", {"token": token, "password": "Another-pass-2026!"}, format="json")
        self.assertEqual(reuse.status_code, 400)

        login = client.post("/api/v1/auth/login/", {"email": "ada@delta.example", "password": "Brand-new-pass-2026!"}, format="json")
        self.assertEqual(login.status_code, 200, login.content)
        me = client.get("/api/v1/auth/me/").json()
        self.assertIn("bunkerflow", me["memberships"][0]["organization"]["enabled_modules"])

    def test_failures_create_nothing(self):
        User.objects.create_user(username="taken@delta.example", email="taken@delta.example", password="x")
        with self.assertRaises(ValidationError):
            self.provision(owner_email="taken@delta.example")
        self.assertFalse(Organization.objects.exists())

        outsider = User.objects.create_user(username="ops", email="ops@offshora.example", password="x", is_staff=True)
        with self.assertRaises(PermissionDenied):
            self.provision(actor=outsider)

        self.provision()
        with self.assertRaises(ValidationError):
            self.provision(owner_email="other@delta.example")
        self.assertEqual(Organization.objects.count(), 1)


class ProvisioningAdminTests(TestCase):
    def setUp(self):
        ProvisioningTests.setUp(self)  # superuser + booking fixture
        self.tenant_admin = User.objects.create_user(username="t", email="t@alpha.example", password="x", is_staff=True)

    def test_superuser_provisions_from_prefilled_form(self):
        self.client.force_login(self.staff)
        url = f"/admin/demo_requests/demorequest/{self.demo.pk}/provision/"
        page = self.client.get(url)
        self.assertEqual(page.status_code, 200)
        self.assertContains(page, 'value="ada@delta.example"')
        self.assertRegex(page.content.decode(), r'value="bunkerflow"[^>]*checked')
        self.assertNotRegex(page.content.decode(), r'value="haultrac"[^>]*checked')
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                url,
                {
                    "organization_name": "Delta Bunker Services Ltd",
                    "plan": "growth",
                    "owner_first_name": "Ada",
                    "owner_last_name": "Obi",
                    "owner_email": "ada@delta.example",
                    "owner_job_title": "Operations Manager",
                    "modules": ["bunkerflow", "refinerylink"],
                    "reason": "Pilot 01",
                },
            )
        org = Organization.objects.get()
        self.assertRedirects(response, f"/admin/organizations/organization/{org.pk}/change/", fetch_redirect_response=False)
        self.assertEqual(enabled_modules(org), CORE_MODULES | {"bunkerflow", "refinerylink"})

    def test_tenant_admins_cannot_provision_or_manage_modules(self):
        self.client.force_login(self.tenant_admin)
        self.assertEqual(self.client.get(f"/admin/demo_requests/demorequest/{self.demo.pk}/provision/").status_code, 403)
        org = Organization.objects.create(name="Other", slug="other")
        self.assertEqual(self.client.get(f"/admin/organizations/organization/{org.pk}/modules/").status_code, 403)


class EntitlementRowLevelSecurityTests(TestCase):
    def setUp(self):
        self.alpha = Organization.objects.create(name="Alpha", slug="alpha")
        self.bravo = Organization.objects.create(name="Bravo", slug="bravo")
        self.alpha_user = member("a@alpha.example", self.alpha)
        self.staff = User.objects.create_superuser(username="staff", email="staff@offshora.example", password="x")
        enable_modules(self.alpha, modules=["bunkerflow"])
        enable_modules(self.bravo, modules=["haultrac"])

    def test_runtime_role_scopes_entitlements_to_members_and_platform_admins(self):
        with connection.cursor() as cursor:
            cursor.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO petroledger_app")
            cursor.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO petroledger_app")
            cursor.execute("SET ROLE petroledger_app")
            try:
                cursor.execute("SELECT set_config('app.current_user_id', %s, false)", (str(self.alpha_user.pk),))
                cursor.execute("SELECT module FROM organizations_organizationmodule ORDER BY module")
                self.assertEqual(cursor.fetchall(), [("bunkerflow",)])
                with self.assertRaises(DatabaseError), transaction.atomic():
                    cursor.execute(
                        "INSERT INTO organizations_organizationmodule (organization_id, module, created_at) VALUES (%s, 'safepass', now())",
                        (self.bravo.pk,),
                    )
            finally:
                cursor.execute("RESET ROLE")
        with connection.cursor() as cursor:
            cursor.execute("SET ROLE petroledger_app")
            try:
                cursor.execute("SELECT set_config('app.current_user_id', %s, false)", (str(self.staff.pk),))
                cursor.execute("SELECT count(*) FROM organizations_organizationmodule")
                self.assertEqual(cursor.fetchone()[0], 2)
            finally:
                cursor.execute("RESET ROLE")
