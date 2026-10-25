from decimal import Decimal
from django.contrib.auth import get_user_model
from django.db import DatabaseError, connection
from django.test import TransactionTestCase

from marine_stores.models import (
    InventoryMovement,
    MarineCatalogueItem,
    StoreInventoryItem,
    StoreOrder,
)
from organizations.models import Membership, Organization

User = get_user_model()


class MarineStoresDatabaseSecurityTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.alpha_user = User.objects.create_user(username="marine-rls-alpha@test.local", email="marine-rls-alpha@test.local", password="password")
        self.bravo_user = User.objects.create_user(username="marine-rls-bravo@test.local", email="marine-rls-bravo@test.local", password="password")
        self.alpha_org = Organization.objects.create(name="Marine RLS Alpha", slug="marine-rls-alpha")
        self.bravo_org = Organization.objects.create(name="Marine RLS Bravo", slug="marine-rls-bravo")
        Membership.objects.create(user=self.alpha_user, organization=self.alpha_org, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo_org, role=Membership.Role.OWNER)

        self.alpha_item = MarineCatalogueItem.objects.create(
            organization=self.alpha_org,
            item_code="SP-ENG-01",
            name="Main Engine Injector Nozzle",
            category=MarineCatalogueItem.Category.SHIP_SPARES,
        )
        self.bravo_item = MarineCatalogueItem.objects.create(
            organization=self.bravo_org,
            item_code="SP-ENG-02",
            name="Aux Engine Oil Filter",
            category=MarineCatalogueItem.Category.SHIP_SPARES,
        )
        self.alpha_stock = StoreInventoryItem.objects.create(
            organization=self.alpha_org,
            item=self.alpha_item,
            location="Port Harcourt Yard",
            quantity_on_hand=Decimal("15.00"),
        )
        self.audit_movement = InventoryMovement.objects.create(
            organization=self.alpha_org,
            catalogue_item=self.alpha_item,
            movement_type=InventoryMovement.MovementType.RECEIPT,
            quantity_delta=Decimal("15.00"),
            resulting_quantity=Decimal("15.00"),
            location="Port Harcourt Yard",
            actor=self.alpha_user,
            reason="Initial inventory intake",
        )

    def test_runtime_database_role_hides_and_rejects_cross_tenant_rows(self):
        with connection.cursor() as cursor:
            cursor.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO petroledger_app")
            cursor.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO petroledger_app")
            cursor.execute("SET ROLE petroledger_app")
            try:
                cursor.execute("SELECT set_config('app.current_user_id', %s, false)", (str(self.alpha_user.pk),))
                cursor.execute("SELECT item_code FROM marine_stores_marinecatalogueitem ORDER BY item_code")
                self.assertEqual([row[0] for row in cursor.fetchall()], ["SP-ENG-01"])

                # Cross-tenant insert must fail RLS
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        """
                        INSERT INTO marine_stores_marinecatalogueitem (
                            public_id, organization_id, item_code, name, category,
                            unit_of_measure, brand, impa_code, minimum_stock_level,
                            is_active, created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), %s, 'FORGED-ITEM', 'Denied Item', 'ship_spares',
                            'piece', '', '', 0, true, now(), now()
                        )
                        """,
                        (self.bravo_org.pk,),
                    )

                # Cross-tenant catalogue reference in inventory item must fail trigger
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        """
                        INSERT INTO marine_stores_storeinventoryitem (
                            public_id, organization_id, item_id, location,
                            batch_or_lot_number, serial_number, quantity_on_hand,
                            unit_cost_minor, currency, storage_condition,
                            created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), %s, %s, 'Onne Dock',
                            '', '', 10, 0, 'NGN', 'ambient', now(), now()
                        )
                        """,
                        (self.alpha_org.pk, self.bravo_item.pk),
                    )
            finally:
                cursor.execute("ROLLBACK")
                cursor.execute("RESET ROLE")

    def test_inventory_movements_are_database_immutable(self):
        with connection.cursor() as cursor:
            with self.assertRaises(DatabaseError):
                cursor.execute(
                    "UPDATE marine_stores_inventorymovement SET reason = 'tampered' WHERE id = %s",
                    (self.audit_movement.pk,),
                )
            with self.assertRaises(DatabaseError):
                cursor.execute(
                    "DELETE FROM marine_stores_inventorymovement WHERE id = %s",
                    (self.audit_movement.pk,),
                )
