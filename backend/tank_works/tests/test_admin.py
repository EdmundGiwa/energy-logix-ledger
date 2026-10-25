from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from organizations.models import Membership, Organization
from tank_works.admin import (
    CoatingInspectionAdmin,
    CrewEquipmentUtilizationAdmin,
    SludgeWasteManifestAdmin,
    TankFieldJobAdmin,
    TankWorksAuditEventAdmin,
)
from tank_works.models import (
    CoatingInspection,
    CrewEquipmentUtilization,
    SludgeWasteManifest,
    TankFieldJob,
    TankWorksAuditEvent,
)

User = get_user_model()


class MockSuperUser:
    is_active = True
    is_staff = True
    is_superuser = True

    def has_perm(self, perm, obj=None):
        return True


class TankWorksAdminTests(TestCase):
    def setUp(self):
        self.site = AdminSite()
        self.factory = RequestFactory()
        self.alpha_user = User.objects.create_user(username="admin-alpha@test.local", email="admin-alpha@test.local", password="password")
        self.bravo_user = User.objects.create_user(username="admin-bravo@test.local", email="admin-bravo@test.local", password="password")
        self.alpha = Organization.objects.create(name="Alpha Tank Admin Org", slug="alpha-tank-admin")
        self.bravo = Organization.objects.create(name="Bravo Tank Admin Org", slug="bravo-tank-admin")
        Membership.objects.create(user=self.alpha_user, organization=self.alpha, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo, role=Membership.Role.OWNER)

        self.alpha_job = TankFieldJob.objects.create(
            organization=self.alpha,
            job_number="TW-ADM-001",
            client_name="Alpha Client",
            terminal_or_facility="Alpha Terminal",
            tank_identifier="TK-ADM-1",
            scope_of_work=TankFieldJob.ScopeOfWork.EVACUATION_CLEANING,
            created_by=self.alpha_user,
            updated_by=self.alpha_user,
        )
        self.bravo_job = TankFieldJob.objects.create(
            organization=self.bravo,
            job_number="TW-ADM-002",
            client_name="Bravo Client",
            terminal_or_facility="Bravo Terminal",
            tank_identifier="TK-ADM-2",
            scope_of_work=TankFieldJob.ScopeOfWork.BLASTING_COATING,
            created_by=self.bravo_user,
            updated_by=self.bravo_user,
        )

    def test_admin_queryset_scoped_to_user_organization(self):
        job_admin = TankFieldJobAdmin(TankFieldJob, self.site)
        req = self.factory.get("/admin/tank_works/tankfieldjob/")
        req.user = self.alpha_user

        qs = job_admin.get_queryset(req)
        self.assertIn(self.alpha_job, qs)
        self.assertNotIn(self.bravo_job, qs)

    def test_superuser_sees_all_jobs(self):
        job_admin = TankFieldJobAdmin(TankFieldJob, self.site)
        req = self.factory.get("/admin/tank_works/tankfieldjob/")
        req.user = MockSuperUser()

        qs = job_admin.get_queryset(req)
        self.assertIn(self.alpha_job, qs)
        self.assertIn(self.bravo_job, qs)
