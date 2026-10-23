from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import DatabaseError, transaction
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from organizations.models import Membership, Organization

from bunkering.models import BunkerAuditEvent, BunkerDeliveryNote, Nomination, Sounding


User = get_user_model()


class BunkerFlowAPITests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner@alpha.test", email="owner@alpha.test", password="password")
        self.other_owner = User.objects.create_user(username="owner@bravo.test", email="owner@bravo.test", password="password")
        self.viewer = User.objects.create_user(username="viewer@alpha.test", email="viewer@alpha.test", password="password")
        self.alpha = Organization.objects.create(name="Alpha Energy", slug="alpha-energy")
        self.bravo = Organization.objects.create(name="Bravo Energy", slug="bravo-energy")
        Membership.objects.create(user=self.owner, organization=self.alpha, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.other_owner, organization=self.bravo, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.viewer, organization=self.alpha, role=Membership.Role.VIEWER)
        self.client.force_login(self.owner)

    def nomination_payload(self, **overrides):
        start = timezone.now() + timedelta(days=1)
        payload = {
            "customer_name": "Bluewater Shipping",
            "vessel_name": "MT Integrity",
            "imo_number": "IMO9876543",
            "port": "Apapa Anchorage",
            "product_grade": "VLSFO 0.5%",
            "nominated_quantity_mt": "1250.000",
            "delivery_window_start": start.isoformat(),
            "delivery_window_end": (start + timedelta(hours=6)).isoformat(),
            "notes": "Pilot nomination",
        }
        payload.update(overrides)
        return payload

    def create_nomination(self, **overrides):
        response = self.client.post(reverse("bunker-nomination-list"), self.nomination_payload(**overrides), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return response

    def transition(self, nomination_id, action, version, reason="Operational review completed"):
        return self.client.post(
            reverse("bunker-nomination-transition", args=(nomination_id, action)),
            {"version": version, "reason": reason},
            format="json",
        )

    def test_complete_nomination_to_issued_bdn_workflow_and_pdf_export(self):
        created = self.create_nomination()
        nomination_id = created.data["id"]
        self.assertIn("confirm", created.data["allowed_actions"])
        create_event = BunkerAuditEvent.objects.get(nomination__public_id=nomination_id, action="create")
        self.assertEqual(str(create_event.request_id), created["X-Request-ID"])
        self.assertEqual(create_event.outcome, BunkerAuditEvent.Outcome.SUCCESS)

        confirmed = self.transition(nomination_id, "confirm", created.data["version"])
        self.assertEqual(confirmed.status_code, status.HTTP_200_OK, confirmed.data)

        sounding = self.client.post(
            reverse("bunker-sounding-create", args=(nomination_id,)),
            {
                "tank_reference": "PORT-01",
                "forward_sounding_m": "4.200",
                "aft_sounding_m": "4.800",
                "observed_volume_m3": "1455.000",
                "observed_temperature_c": "31.800",
                "density_kg_m3": "845.200",
                "reviewed_volume_m3": "1478.900",
                "reviewed_mass_mt": "1250.000",
                "calculation_method_note": "Result transcribed from an independently reviewed worksheet; no calculation was performed by Offshora.",
            },
            format="json",
        )
        self.assertEqual(sounding.status_code, status.HTTP_201_CREATED, sounding.data)
        reviewed = self.client.post(
            reverse("bunker-sounding-review", args=(nomination_id,)),
            {"sounding_id": sounding.data["id"], "version": sounding.data["version"], "reason": "Matched the approved worksheet."},
            format="json",
        )
        self.assertEqual(reviewed.status_code, status.HTTP_200_OK, reviewed.data)
        self.assertEqual(reviewed.data["status"], Nomination.Status.SOUNDING_RECORDED)

        now = timezone.now()
        bdn = self.client.post(
            reverse("bunker-bdn", args=(nomination_id,)),
            {
                "number": "BDN-ALPHA-0001",
                "delivered_quantity_mt": "1250.000",
                "flashpoint_c": "66.000",
                "viscosity_cst": "138.000",
                "sulphur_percent": "0.4200",
                "water_percent": "0.1000",
                "supplier_acknowledged_by": "Ada Supplier",
                "supplier_acknowledged_at": now.isoformat(),
                "receiver_acknowledged_by": "Chief Engineer Musa",
                "receiver_acknowledged_at": now.isoformat(),
                "version": reviewed.data["version"],
            },
            format="json",
        )
        self.assertEqual(bdn.status_code, status.HTTP_201_CREATED, bdn.data)
        under_review = self.transition(nomination_id, "submit_review", bdn.data["version"])
        self.assertEqual(under_review.status_code, status.HTTP_200_OK, under_review.data)
        approved = self.transition(nomination_id, "approve", under_review.data["version"])
        self.assertEqual(approved.status_code, status.HTTP_200_OK, approved.data)
        issued = self.transition(nomination_id, "issue", approved.data["version"])
        self.assertEqual(issued.status_code, status.HTTP_200_OK, issued.data)
        self.assertEqual(issued.data["status"], Nomination.Status.ISSUED)
        self.assertEqual(issued.data["bdn"]["status"], BunkerDeliveryNote.Status.ISSUED)
        self.assertEqual(issued.data["allowed_actions"], ["export"])

        exported = self.client.get(reverse("bunker-bdn-export", args=(nomination_id,)))
        self.assertEqual(exported.status_code, status.HTTP_200_OK)
        self.assertEqual(exported["Content-Type"], "application/pdf")
        document = b"".join(exported.streaming_content)
        self.assertTrue(document.startswith(b"%PDF-1.4"))
        self.assertIn(b"BDN-ALPHA-0001", document)
        self.assertIn(b"not represented as cryptographic signatures", document)
        self.assertTrue(document.rstrip().endswith(b"%%EOF"))
        self.assertTrue(BunkerAuditEvent.objects.filter(nomination__public_id=nomination_id, action="export_bdn").exists())
        with self.assertRaises(DatabaseError), transaction.atomic():
            BunkerDeliveryNote.objects.filter(nomination__public_id=nomination_id).update(number="MUTATED")
        with self.assertRaises(DatabaseError), transaction.atomic():
            BunkerAuditEvent.objects.filter(nomination__public_id=nomination_id).update(reason="MUTATED")

    def test_second_tenant_cannot_read_update_search_or_reference_first_tenant_records(self):
        created = self.create_nomination(reference="ALPHA-SECRET-001")
        nomination_id = created.data["id"]
        self.client.force_login(self.other_owner)

        detail = self.client.get(reverse("bunker-nomination-detail", args=(nomination_id,)))
        self.assertEqual(detail.status_code, status.HTTP_404_NOT_FOUND)
        update = self.client.patch(reverse("bunker-nomination-detail", args=(nomination_id,)), {"version": 1, "port": "Changed"}, format="json")
        self.assertEqual(update.status_code, status.HTTP_404_NOT_FOUND)
        search = self.client.get(reverse("bunker-nomination-list"), {"search": "ALPHA-SECRET-001"})
        self.assertEqual(search.status_code, status.HTTP_200_OK)
        self.assertEqual(search.data["results"], [])
        transition = self.transition(nomination_id, "confirm", 1)
        self.assertEqual(transition.status_code, status.HTTP_404_NOT_FOUND)

    def test_forged_tenant_header_is_rejected(self):
        response = self.client.get(
            reverse("bunker-nomination-list"),
            HTTP_X_ORGANIZATION_ID=str(self.bravo.public_id),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_viewer_is_read_only(self):
        self.client.force_login(self.viewer)
        response = self.client.post(reverse("bunker-nomination-list"), self.nomination_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_stale_version_is_rejected(self):
        created = self.create_nomination()
        first = self.transition(created.data["id"], "confirm", created.data["version"])
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        stale = self.transition(created.data["id"], "confirm", created.data["version"])
        self.assertEqual(stale.status_code, status.HTTP_409_CONFLICT)

    def test_invalid_window_and_nonpositive_quantity_are_rejected(self):
        start = timezone.now() + timedelta(days=2)
        invalid_window = self.client.post(
            reverse("bunker-nomination-list"),
            self.nomination_payload(delivery_window_start=start.isoformat(), delivery_window_end=(start - timedelta(hours=1)).isoformat()),
            format="json",
        )
        self.assertEqual(invalid_window.status_code, status.HTTP_400_BAD_REQUEST)
        invalid_quantity = self.client.post(reverse("bunker-nomination-list"), self.nomination_payload(nominated_quantity_mt="0"), format="json")
        self.assertEqual(invalid_quantity.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancelled_nomination_bdn_cannot_be_edited_by_direct_api_call(self):
        created = self.create_nomination()
        nomination = Nomination.objects.get(public_id=created.data["id"])
        nomination.status = Nomination.Status.CANCELLED
        nomination.save(update_fields=("status", "updated_at"))
        bdn = BunkerDeliveryNote.objects.create(
            organization=self.alpha,
            nomination=nomination,
            number="CANCELLED-BDN",
            delivered_quantity_mt="10.000",
            flashpoint_c="60.000",
            viscosity_cst="100.000",
            sulphur_percent="0.1000",
            water_percent="0.1000",
            created_by=self.owner,
        )
        response = self.client.patch(
            reverse("bunker-bdn", args=(nomination.public_id,)),
            {"version": bdn.version, "water_percent": "0.2000"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        bdn.refresh_from_db()
        self.assertEqual(str(bdn.water_percent), "0.1000")

    def test_sounding_cannot_be_reviewed_after_bdn_preparation_starts(self):
        created = self.create_nomination()
        nomination = Nomination.objects.get(public_id=created.data["id"])
        nomination.status = Nomination.Status.BDN_DRAFT
        nomination.save(update_fields=("status", "updated_at"))
        sounding = Sounding.objects.create(
            organization=self.alpha,
            nomination=nomination,
            tank_reference="LATE-01",
            forward_sounding_m="1.000",
            aft_sounding_m="1.000",
            observed_volume_m3="10.000",
            observed_temperature_c="30.000",
            density_kg_m3="800.000",
            reviewed_volume_m3="10.000",
            reviewed_mass_mt="8.000",
            calculation_method_note="Test worksheet",
            recorded_by=self.owner,
        )
        response = self.client.post(
            reverse("bunker-sounding-review", args=(nomination.public_id,)),
            {"sounding_id": sounding.public_id, "version": sounding.version, "reason": "Too late"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        sounding.refresh_from_db()
        self.assertEqual(sounding.status, Sounding.Status.DRAFT)

    def test_bdn_cannot_start_while_any_sounding_is_still_draft(self):
        created = self.create_nomination()
        nomination = Nomination.objects.get(public_id=created.data["id"])
        nomination.status = Nomination.Status.SOUNDING_RECORDED
        nomination.save(update_fields=("status", "updated_at"))
        Sounding.objects.create(
            organization=self.alpha, nomination=nomination, tank_reference="PENDING-02",
            forward_sounding_m="1.000", aft_sounding_m="1.000", observed_volume_m3="10.000",
            observed_temperature_c="30.000", density_kg_m3="800.000", reviewed_volume_m3="10.000",
            reviewed_mass_mt="8.000", calculation_method_note="Pending worksheet review", recorded_by=self.owner,
        )
        detail = self.client.get(reverse("bunker-nomination-detail", args=(nomination.public_id,)))
        self.assertNotIn("create_bdn", detail.data["allowed_actions"])
        response = self.client.post(
            reverse("bunker-bdn", args=(nomination.public_id,)),
            {
                "number": "SHOULD-NOT-EXIST", "delivered_quantity_mt": "8.000",
                "flashpoint_c": "60.000", "viscosity_cst": "100.000",
                "sulphur_percent": "0.1000", "water_percent": "0.1000",
                "supplier_acknowledged_by": "Supplier", "supplier_acknowledged_at": timezone.now().isoformat(),
                "receiver_acknowledged_by": "Receiver", "receiver_acknowledged_at": timezone.now().isoformat(),
                "version": nomination.version,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(BunkerDeliveryNote.objects.filter(nomination=nomination).exists())

    def test_bdn_without_both_acknowledgements_cannot_enter_review(self):
        created = self.create_nomination()
        nomination = Nomination.objects.get(public_id=created.data["id"])
        nomination.status = Nomination.Status.BDN_DRAFT
        nomination.save(update_fields=("status", "updated_at"))
        BunkerDeliveryNote.objects.create(
            organization=self.alpha, nomination=nomination, number="ACK-PENDING",
            delivered_quantity_mt="10.000", flashpoint_c="60.000", viscosity_cst="100.000",
            sulphur_percent="0.1000", water_percent="0.1000", created_by=self.owner,
        )
        response = self.transition(nomination.public_id, "submit_review", nomination.version)
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        nomination.refresh_from_db()
        self.assertEqual(nomination.status, Nomination.Status.BDN_DRAFT)
