from decimal import Decimal
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from organizations.models import Membership, Organization
from refinery_link.admin import DepotTankAdmin, OfftakeAppointmentAdmin, TerminalAdmin
from refinery_link.models import DepotTank, OfftakeAppointment, Terminal


User = get_user_model()


class MockSuperUser:
    is_active = True
    is_staff = True
    is_superuser = True


class MockTenantUser:
    def __init__(self, user):
        self.user = user
        self.is_active = True
        self.is_staff = True
        self.is_superuser = False
        self.pk = user.pk


class RefineryAdminTests(TestCase):
    def setUp(self):
        self.site = AdminSite()
        self.factory = RequestFactory()
        self.alpha_user = User.objects.create_user(username="ref-admin-a@test.local", email="ref-admin-a@test.local", password="password")
        self.bravo_user = User.objects.create_user(username="ref-admin-b@test.local", email="ref-admin-b@test.local", password="password")
        self.alpha = Organization.objects.create(name="Alpha Depot Admin", slug="alpha-depot-admin")
        self.bravo = Organization.objects.create(name="Bravo Depot Admin", slug="bravo-depot-admin")
        Membership.objects.create(user=self.alpha_user, organization=self.alpha, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo, role=Membership.Role.OWNER)

        self.alpha_terminal = Terminal.objects.create(organization=self.alpha, code="TERM-A", name="Term A", location="A")
        self.bravo_terminal = Terminal.objects.create(organization=self.bravo, code="TERM-B", name="Term B", location="B")

    def test_terminal_admin_filters_queryset_by_tenant(self):
        admin = TerminalAdmin(Terminal, self.site)
        request = self.factory.get("/admin/refinery_link/terminal/")
        request.user = self.alpha_user

        qs = admin.get_queryset(request)
        codes = [t.code for t in qs]
        self.assertIn("TERM-A", codes)
        self.assertNotIn("TERM-B", codes)

    def test_admin_has_no_add_or_delete_permission_directly(self):
        admin = TerminalAdmin(Terminal, self.site)
        request = self.factory.get("/admin/refinery_link/terminal/")
        request.user = self.alpha_user

        self.assertFalse(admin.has_add_permission(request))
        self.assertFalse(admin.has_delete_permission(request))
