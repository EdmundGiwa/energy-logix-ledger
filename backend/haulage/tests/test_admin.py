from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from organizations.models import Membership, Organization

from haulage.admin import DispatchAdmin
from haulage.models import Customer, DeliveryLocation, Dispatch, Driver, ElectronicWaybill, Fleet, FleetAuditEvent, HaulageAuditEvent, ProofOfDelivery, Trailer, Truck, WeighbridgeReading


User = get_user_model()


class HaulageAdminTests(TestCase):
    def test_all_models_are_registered_with_safe_tenant_scoped_admin(self):
        for model in (Customer, DeliveryLocation, Truck, Trailer, Driver, Fleet, FleetAuditEvent, Dispatch, WeighbridgeReading, ElectronicWaybill, ProofOfDelivery, HaulageAuditEvent):
            self.assertIn(model, admin.site._registry)
            model_admin = admin.site._registry[model]
            self.assertFalse(model_admin.has_add_permission(RequestFactory().get("/admin/")))
            self.assertFalse(model_admin.has_delete_permission(RequestFactory().get("/admin/")))

    def test_dispatch_queryset_is_tenant_scoped_for_non_superuser(self):
        first = Organization.objects.create(name="First", slug="haul-first")
        second = Organization.objects.create(name="Second", slug="haul-second")
        user = User.objects.create_user(username="staff@first.test", email="staff@first.test", password="password", is_staff=True)
        Membership.objects.create(user=user, organization=first, role=Membership.Role.ADMIN)
        request = RequestFactory().get("/admin/haulage/dispatch/")
        request.user = user
        queryset = DispatchAdmin(Dispatch, admin.site).get_queryset(request)
        self.assertFalse(queryset.filter(organization=second).exists())
