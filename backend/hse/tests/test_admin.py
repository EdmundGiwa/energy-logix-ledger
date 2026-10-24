from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from organizations.models import Membership, Organization
from hse.admin import (
    CredentialAdmin,
    GasTestAdmin,
    HseAuditEventAdmin,
    MobilizationAdmin,
    MobilizationWorkerAdmin,
    PermitAdmin,
    SafetyAcknowledgementAdmin,
    SafetyProcedureAdmin,
    WorkerAdmin,
)
from hse.models import Credential, GasTest, HseAuditEvent, Mobilization, MobilizationWorker, Permit, SafetyAcknowledgement, SafetyProcedure, Worker


class SafePassAdminTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="hse-admin@test.local", email="hse-admin@test.local", password="password", is_staff=True)
        self.organization = Organization.objects.create(name="HSE Admin Tenant", slug="hse-admin-tenant")
        Membership.objects.create(user=self.user, organization=self.organization, role=Membership.Role.ADMIN)
        self.request = RequestFactory().get("/admin/hse/")
        self.request.user = self.user

    def test_operational_admins_are_registered_read_only_and_searchable(self):
        registrations = (
            (Worker, WorkerAdmin),
            (Credential, CredentialAdmin),
            (SafetyProcedure, SafetyProcedureAdmin),
            (Mobilization, MobilizationAdmin),
            (MobilizationWorker, MobilizationWorkerAdmin),
            (Permit, PermitAdmin),
            (GasTest, GasTestAdmin),
            (SafetyAcknowledgement, SafetyAcknowledgementAdmin),
            (HseAuditEvent, HseAuditEventAdmin),
        )
        for model, admin_class in registrations:
            self.assertIsInstance(admin.site._registry[model], admin_class)
            model_admin = admin.site._registry[model]
            self.assertTrue(model_admin.list_display)
            self.assertTrue(model_admin.list_filter)
            self.assertTrue(model_admin.search_fields)
            self.assertTrue(model_admin.ordering)
            self.assertFalse(model_admin.has_add_permission(self.request))
            self.assertFalse(model_admin.has_change_permission(self.request))
            self.assertFalse(model_admin.has_delete_permission(self.request))

    def test_admin_queryset_is_scoped_to_membership(self):
        other = Organization.objects.create(name="Other HSE Tenant", slug="other-hse-tenant")
        Worker.objects.create(organization=self.organization, employee_number="OURS", full_name="Our Worker", job_title="Tech")
        Worker.objects.create(organization=other, employee_number="THEIRS", full_name="Other Worker", job_title="Tech")
        queryset = admin.site._registry[Worker].get_queryset(self.request)
        self.assertEqual(list(queryset.values_list("employee_number", flat=True)), ["OURS"])
