from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from marine_stores.admin import (
    MarineCatalogueItemAdmin,
    RefrigerantCylinderAdmin,
    StoreInventoryItemAdmin,
    StoreOrderAdmin,
)
from marine_stores.models import (
    MarineCatalogueItem,
    RefrigerantCylinder,
    StoreInventoryItem,
    StoreOrder,
)
from organizations.models import Membership, Organization

User = get_user_model()


class MockSuperUser:
    is_active = True
    is_staff = True
    is_superuser = True

    def has_perm(self, perm, obj=None):
        return True


class MarineStoresAdminTests(TestCase):
    def setUp(self):
        self.site = AdminSite()
        self.factory = RequestFactory()
        self.alpha_user = User.objects.create_user(username="admin-alpha@test.local", email="admin-alpha@test.local", password="password")
        self.bravo_user = User.objects.create_user(username="admin-bravo@test.local", email="admin-bravo@test.local", password="password")
        self.alpha = Organization.objects.create(name="Alpha Marine Admin", slug="alpha-admin")
        self.bravo = Organization.objects.create(name="Bravo Marine Admin", slug="bravo-admin")
        Membership.objects.create(user=self.alpha_user, organization=self.alpha, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo, role=Membership.Role.OWNER)

        self.alpha_item = MarineCatalogueItem.objects.create(
            organization=self.alpha,
            item_code="SP-001",
            name="Filter Element",
            category=MarineCatalogueItem.Category.SHIP_SPARES,
        )
        self.bravo_item = MarineCatalogueItem.objects.create(
            organization=self.bravo,
            item_code="SP-002",
            name="Gasket Set",
            category=MarineCatalogueItem.Category.SHIP_SPARES,
        )

    def test_admin_queryset_scoped_to_user_organization(self):
        item_admin = MarineCatalogueItemAdmin(MarineCatalogueItem, self.site)
        req = self.factory.get("/admin/marine_stores/marinecatalogueitem/")
        req.user = self.alpha_user

        qs = item_admin.get_queryset(req)
        self.assertIn(self.alpha_item, qs)
        self.assertNotIn(self.bravo_item, qs)

    def test_superuser_sees_all(self):
        item_admin = MarineCatalogueItemAdmin(MarineCatalogueItem, self.site)
        req = self.factory.get("/admin/marine_stores/marinecatalogueitem/")
        req.user = MockSuperUser()

        qs = item_admin.get_queryset(req)
        self.assertIn(self.alpha_item, qs)
        self.assertIn(self.bravo_item, qs)
