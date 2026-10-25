from decimal import Decimal
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from marine_stores.models import (
    InventoryMovement,
    MarineCatalogueItem,
    RefrigerantCylinder,
    StoreInventoryItem,
    StoreOrder,
    StoreOrderItem,
)
from organizations.models import Membership, Organization

User = get_user_model()


class MarineStoresAPITests(APITestCase):
    def setUp(self):
        self.alpha_user = User.objects.create_user(username="marine-alpha@test.local", email="marine-alpha@test.local", password="password")
        self.bravo_user = User.objects.create_user(username="marine-bravo@test.local", email="marine-bravo@test.local", password="password")
        self.alpha = Organization.objects.create(name="Alpha Marine Services", slug="alpha-marine")
        self.bravo = Organization.objects.create(name="Bravo Marine Logistics", slug="bravo-marine")
        Membership.objects.create(user=self.alpha_user, organization=self.alpha, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo, role=Membership.Role.OWNER)
        self.client.force_login(self.alpha_user)

        # Alpha items
        self.alpha_lube = MarineCatalogueItem.objects.create(
            organization=self.alpha,
            item_code="LUB-5001",
            name="Mobilgard 412 Trunk Piston Engine Oil",
            category=MarineCatalogueItem.Category.LUBRICANTS,
            unit_of_measure="litres",
            brand="Mobil",
            minimum_stock_level=500,
        )
        self.alpha_valve = MarineCatalogueItem.objects.create(
            organization=self.alpha,
            item_code="SP-VALVE-01",
            name="High Pressure Butterfly Valve 6-inch",
            category=MarineCatalogueItem.Category.SHIP_SPARES,
            unit_of_measure="piece",
            minimum_stock_level=2,
        )

        # Bravo item
        self.bravo_item = MarineCatalogueItem.objects.create(
            organization=self.bravo,
            item_code="MED-FIRSTAID",
            name="IMO Medical Kit Category A",
            category=MarineCatalogueItem.Category.MEDICAL,
            unit_of_measure="kit",
        )

    def test_two_tenant_catalogue_isolation(self):
        # Alpha lists catalogue
        res = self.client.get(reverse("marine_stores:catalogue-list-create"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        codes = [item["item_code"] for item in res.data]
        self.assertIn("LUB-5001", codes)
        self.assertIn("SP-VALVE-01", codes)
        self.assertNotIn("MED-FIRSTAID", codes)

        # Alpha tries to access Bravo item detail directly
        detail_res = self.client.get(reverse("marine_stores:catalogue-detail", kwargs={"public_id": self.bravo_item.public_id}))
        self.assertEqual(detail_res.status_code, status.HTTP_404_NOT_FOUND)

    def test_stock_intake_and_inventory_movement_audit(self):
        # Record stock intake for LUB-5001
        res = self.client.post(
            reverse("marine_stores:inventory-list-create"),
            {
                "item_id": str(self.alpha_lube.public_id),
                "location": "Onne Base Bay 4",
                "quantity": "1200.00",
                "unit_cost_minor": 450000,
                "currency": "NGN",
                "batch_or_lot_number": "BATCH-2026-X1",
                "reason": "Direct delivery from ExxonMobil Onne depot",
            },
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(res.data["quantity_on_hand"]), Decimal("1200.00"))

        # Verify inventory movement was logged
        movement = InventoryMovement.objects.filter(organization=self.alpha, catalogue_item=self.alpha_lube).first()
        self.assertIsNotNone(movement)
        self.assertEqual(movement.movement_type, InventoryMovement.MovementType.RECEIPT)
        self.assertEqual(movement.quantity_delta, Decimal("1200.00"))
        self.assertEqual(movement.resulting_quantity, Decimal("1200.00"))

        # Verify summary counts
        summary_res = self.client.get(reverse("marine_stores:summary"))
        self.assertEqual(summary_res.status_code, status.HTTP_200_OK)
        self.assertEqual(summary_res.data["total_catalogue_items"], 2)

    def test_order_lifecycle_deduction_and_version_locking(self):
        # Intake stock first
        self.client.post(
            reverse("marine_stores:inventory-list-create"),
            {
                "item_id": str(self.alpha_lube.public_id),
                "location": "Port Harcourt Main Yard",
                "quantity": "2000.00",
                "unit_cost_minor": 450000,
                "currency": "NGN",
            },
        )

        # 1. Create Order
        order_res = self.client.post(
            reverse("marine_stores:orders-list-create"),
            {
                "vessel_or_installation": "MT Ocean Venture",
                "destination": "Bonny Offshore Terminal",
                "requested_delivery_date": "2026-11-05",
                "line_items": [
                    {
                        "catalogue_item_id": str(self.alpha_lube.public_id),
                        "quantity_requested": "400.00",
                        "unit_price_minor": 550000,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(order_res.status_code, status.HTTP_201_CREATED)
        order_id = order_res.data["id"]
        version = order_res.data["version"]
        self.assertEqual(order_res.data["status"], StoreOrder.Status.DRAFT)
        self.assertEqual(order_res.data["total_minor"], 400 * 550000)

        # 2. Approve Order
        approve_res = self.client.post(
            reverse("marine_stores:orders-transition", kwargs={"public_id": order_id, "action": "approve"}),
            {"version": version, "reason": "Authorized by Marine Superintendent"},
            format="json",
        )
        self.assertEqual(approve_res.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_res.data["status"], StoreOrder.Status.APPROVED)
        version = approve_res.data["version"]

        # 3. Test stale version conflict rejection (409)
        stale_res = self.client.post(
            reverse("marine_stores:orders-transition", kwargs={"public_id": order_id, "action": "dispatch"}),
            {"version": 1, "reason": "Attempting action with outdated version"},
            format="json",
        )
        self.assertEqual(stale_res.status_code, status.HTTP_409_CONFLICT)

        # 4. Dispatch with correct version -> stock deduction
        dispatch_res = self.client.post(
            reverse("marine_stores:orders-transition", kwargs={"public_id": order_id, "action": "dispatch"}),
            {"version": version, "reason": "Barge loaded at PH yard"},
            format="json",
        )
        self.assertEqual(dispatch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(dispatch_res.data["status"], StoreOrder.Status.DISPATCHED)
        version = dispatch_res.data["version"]

        # Check stock was deducted: 2000 - 400 = 1600
        stock = StoreInventoryItem.objects.get(organization=self.alpha, item=self.alpha_lube)
        self.assertEqual(stock.quantity_on_hand, Decimal("1600.00"))

        # 5. Deliver & Sign
        deliver_res = self.client.post(
            reverse("marine_stores:orders-transition", kwargs={"public_id": order_id, "action": "deliver"}),
            {
                "version": version,
                "delivery_data": {
                    "receiving_officer_name": "Chief Engineer K. Okon",
                    "receiving_signature_ref": "SIG-MT-OV-8849",
                },
            },
            format="json",
        )
        self.assertEqual(deliver_res.status_code, status.HTTP_200_OK)
        self.assertEqual(deliver_res.data["status"], StoreOrder.Status.DELIVERED)
        self.assertEqual(deliver_res.data["receiving_officer_name"], "Chief Engineer K. Okon")

    def test_refrigerant_cylinder_tracking_and_marpol_compliance(self):
        cyl_res = self.client.post(
            reverse("marine_stores:cylinders-list-create"),
            {
                "cylinder_serial": "CYL-R404A-9921",
                "gas_type": "R404A",
                "tare_weight_kg": "14.50",
                "gross_weight_kg": "24.50",
                "net_gas_weight_kg": "10.00",
                "status": RefrigerantCylinder.Status.IN_SERVICE,
                "assigned_vessel_or_facility": "FPSO Mystras",
                "marpol_compliant": True,
            },
        )
        self.assertEqual(cyl_res.status_code, status.HTTP_201_CREATED)
        cyl_id = cyl_res.data["id"]

        # Update to recovered
        patch_res = self.client.patch(
            reverse("marine_stores:cylinders-detail", kwargs={"public_id": cyl_id}),
            {
                "status": RefrigerantCylinder.Status.RECOVERED,
                "environmental_notes": "Recovered during provision cooling unit overhaul",
            },
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data["status"], RefrigerantCylinder.Status.RECOVERED)
        self.assertIsNotNone(patch_res.data["recovery_logged_at"])
