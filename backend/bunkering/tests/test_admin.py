from datetime import timedelta

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import RequestFactory
from django.test import TestCase
from django.utils import timezone

from bunkering.models import BunkerAuditEvent, BunkerDeliveryNote, Nomination, Sounding
from organizations.models import Membership, Organization


User = get_user_model()


class BunkerAdminRegistrationTests(TestCase):
    def test_all_production_models_have_deliberate_admin_registration(self):
        for model in (Nomination, Sounding, BunkerDeliveryNote, BunkerAuditEvent):
            self.assertIn(model, admin.site._registry)
            registration = admin.site._registry[model]
            self.assertTrue(registration.list_display)
            self.assertTrue(registration.list_filter)
            self.assertTrue(registration.search_fields)

    def test_admin_is_read_only_and_tenant_scoped_for_non_superusers(self):
        first_user = User.objects.create_user(username="admin-one@test.local", email="admin-one@test.local", password="password", is_staff=True)
        second_user = User.objects.create_user(username="admin-two@test.local", email="admin-two@test.local", password="password", is_staff=True)
        first_org = Organization.objects.create(name="Admin One", slug="admin-one")
        second_org = Organization.objects.create(name="Admin Two", slug="admin-two")
        Membership.objects.create(user=first_user, organization=first_org, role=Membership.Role.ADMIN)
        Membership.objects.create(user=second_user, organization=second_org, role=Membership.Role.ADMIN)
        start = timezone.now() + timedelta(days=1)
        first = Nomination.objects.create(organization=first_org, reference="ADMIN-ONE", customer_name="One", vessel_name="One", port="One", product_grade="One", nominated_quantity_mt=1, delivery_window_start=start, delivery_window_end=start + timedelta(hours=1), created_by=first_user, updated_by=first_user)
        Nomination.objects.create(organization=second_org, reference="ADMIN-TWO", customer_name="Two", vessel_name="Two", port="Two", product_grade="Two", nominated_quantity_mt=1, delivery_window_start=start, delivery_window_end=start + timedelta(hours=1), created_by=second_user, updated_by=second_user)
        request = RequestFactory().get("/admin/bunkering/nomination/")
        request.user = first_user
        registration = admin.site._registry[Nomination]

        self.assertEqual(list(registration.get_queryset(request)), [first])
        self.assertFalse(registration.has_add_permission(request))
        self.assertFalse(registration.has_change_permission(request, first))
        self.assertFalse(registration.has_delete_permission(request, first))
        self.assertIn("public_id", registration.readonly_fields)
