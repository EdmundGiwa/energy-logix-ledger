from decimal import Decimal
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from organizations.models import Membership, Organization
from owner_dashboard.admin import (
    ExecutiveExceptionAlertAdmin,
    ExecutiveExportJobAdmin,
    ExecutiveKpiSnapshotAdmin,
)
from owner_dashboard.models import (
    Currency,
    ExecutiveExceptionAlert,
    ExecutiveExportJob,
    ExecutiveKpiSnapshot,
)

User = get_user_model()


class OwnerDashboardAdminTests(TestCase):
    def setUp(self):
        self.site = AdminSite()
        self.factory = RequestFactory()

        self.alpha_user = User.objects.create_user(username="adm-alpha@test.local", email="adm-alpha@test.local", password="password")
        self.bravo_user = User.objects.create_user(username="adm-bravo@test.local", email="adm-bravo@test.local", password="password")

        self.alpha_org = Organization.objects.create(name="Alpha Org Exec Admin", slug="alpha-org-exec")
        self.bravo_org = Organization.objects.create(name="Bravo Org Exec Admin", slug="bravo-org-exec")

        Membership.objects.create(user=self.alpha_user, organization=self.alpha_org, role=Membership.Role.ADMIN)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo_org, role=Membership.Role.ADMIN)

        self.alpha_snapshot = ExecutiveKpiSnapshot.objects.create(
            organization=self.alpha_org,
            currency=Currency.USD,
            gross_billed_minor=1000000,
        )
        self.bravo_snapshot = ExecutiveKpiSnapshot.objects.create(
            organization=self.bravo_org,
            currency=Currency.USD,
            gross_billed_minor=2000000,
        )

        self.alpha_alert = ExecutiveExceptionAlert.objects.create(
            organization=self.alpha_org,
            severity=ExecutiveExceptionAlert.Severity.CRITICAL,
            module=ExecutiveExceptionAlert.ModuleSource.REFINERY_LINK,
            title="Alpha Gantry Alert",
            description="Alpha description",
            source_record_type="MeterTicket",
            source_record_id="TKT-01",
        )
        self.bravo_alert = ExecutiveExceptionAlert.objects.create(
            organization=self.bravo_org,
            severity=ExecutiveExceptionAlert.Severity.CRITICAL,
            module=ExecutiveExceptionAlert.ModuleSource.REFINERY_LINK,
            title="Bravo Gantry Alert",
            description="Bravo description",
            source_record_type="MeterTicket",
            source_record_id="TKT-02",
        )

    def test_admin_querysets_are_tenant_scoped(self):
        request = self.factory.get("/admin/owner_dashboard/executiveexceptionalert/")
        request.user = self.alpha_user

        admin_instance = ExecutiveExceptionAlertAdmin(ExecutiveExceptionAlert, self.site)
        qs = admin_instance.get_queryset(request)

        self.assertIn(self.alpha_alert, qs)
        self.assertNotIn(self.bravo_alert, qs)

    def test_admin_disallows_direct_mutations(self):
        request = self.factory.get("/admin/owner_dashboard/executivekpisnapshot/")
        request.user = self.alpha_user

        admin_instance = ExecutiveKpiSnapshotAdmin(ExecutiveKpiSnapshot, self.site)
        self.assertFalse(admin_instance.has_add_permission(request))
        self.assertFalse(admin_instance.has_change_permission(request, self.alpha_snapshot))
        self.assertFalse(admin_instance.has_delete_permission(request, self.alpha_snapshot))
