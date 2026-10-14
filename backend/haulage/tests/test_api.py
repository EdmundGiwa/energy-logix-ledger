from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import DatabaseError, transaction
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from organizations.models import Membership, Organization

from haulage.models import Dispatch, Fleet, FleetAuditEvent, HaulageAuditEvent, ProofOfDelivery, WeighbridgeReading


User = get_user_model()


class HaulTracAPITests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner@alpha.test", email="owner@alpha.test", password="password")
        self.other_owner = User.objects.create_user(username="owner@bravo.test", email="owner@bravo.test", password="password")
        self.viewer = User.objects.create_user(username="viewer@alpha.test", email="viewer@alpha.test", password="password")
        self.alpha = Organization.objects.create(name="Alpha Haulage", slug="alpha-haulage")
        self.bravo = Organization.objects.create(name="Bravo Haulage", slug="bravo-haulage")
        Membership.objects.create(user=self.owner, organization=self.alpha, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.other_owner, organization=self.bravo, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.viewer, organization=self.alpha, role=Membership.Role.VIEWER)
        self.client.force_login(self.owner)
        self.refs = self.create_references()

    def create_references(self):
        resources = {
            "customer": ("haul-customer-list", {"name": "Ikeja Industrial Depot", "contact_name": "A. Bello", "contact_phone": "+2348000000000"}),
            "origin": ("haul-location-list", {"name": "Lekki Loading Terminal", "address": "Lekki Free Zone"}),
            "destination": ("haul-location-list", {"name": "Ikeja Depot", "address": "Industrial Estate, Ikeja"}),
            "truck": ("haul-truck-list", {"registration_number": "LAG-4418", "fleet_number": "TRK-018", "make_model": "MAN TGS", "capacity_litres": "45000.000"}),
            "trailer": ("haul-trailer-list", {"registration_number": "LAG-TR-4418", "fleet_number": "TRL-018", "capacity_litres": "45000.000", "calibration_expires_on": (timezone.localdate() + timedelta(days=180)).isoformat()}),
            "driver": ("haul-driver-list", {"full_name": "Musa Adeyemi", "phone_number": "+2348111111111", "licence_number": "DRV-LAG-001", "licence_expires_on": (timezone.localdate() + timedelta(days=365)).isoformat()}),
        }
        result = {}
        for key, (url_name, payload) in resources.items():
            response = self.client.post(reverse(url_name), payload, format="json")
            self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
            result[key] = response.data["id"]
        return result

    def create_dispatch(self, **overrides):
        payload = {
            "customer_id": self.refs["customer"], "origin_id": self.refs["origin"],
            "destination_id": self.refs["destination"], "truck_id": self.refs["truck"],
            "trailer_id": self.refs["trailer"], "driver_id": self.refs["driver"],
            "product": "AGO", "planned_quantity_litres": "45000.000",
            "scheduled_departure_at": (timezone.now() + timedelta(hours=2)).isoformat(),
            "notes": "Acceptance trip",
        }
        payload.update(overrides)
        response = self.client.post(reverse("haul-dispatch-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return response

    def transition(self, dispatch_id, action, version, reason="Operational checkpoint completed"):
        return self.client.post(reverse("haul-dispatch-transition", args=(dispatch_id, action)), {"version": version, "reason": reason}, format="json")

    def create_fleet(self):
        created = self.client.post(reverse("haul-fleet-list"), {}, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
        fleet = created.data
        stages = (
            ("customer", {"name": "Ikeja Industrial Depot", "contact_name": "A. Bello", "contact_phone": "+2348000000000"}),
            ("route", {
                "origin": {"name": "Lekki Loading Terminal", "address": "Lekki Free Zone"},
                "destination": {"name": "Ikeja Depot", "address": "Industrial Estate, Ikeja"},
            }),
            ("truck", {"registration_number": "LAG-4418", "fleet_number": "TRK-018", "make_model": "MAN TGS", "capacity_litres": "45000.000"}),
            ("trailer", {"registration_number": "LAG-TR-4418", "fleet_number": "TRL-018", "capacity_litres": "45000.000", "calibration_expires_on": (timezone.localdate() + timedelta(days=180)).isoformat()}),
            ("driver", {"full_name": "Musa Adeyemi", "phone_number": "+2348111111111", "licence_number": "DRV-LAG-001", "licence_expires_on": (timezone.localdate() + timedelta(days=365)).isoformat()}),
        )
        for stage, data in stages:
            response = self.client.post(reverse("haul-fleet-stage", args=(fleet["id"],)), {"version": fleet["version"], "stage": stage, "data": data}, format="json")
            self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
            fleet = response.data
        return fleet

    def test_fleet_draft_is_resumable_and_ready_fleet_creates_dispatch(self):
        created = self.client.post(reverse("haul-fleet-list"), {}, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        fleet_id = created.data["id"]
        customer = self.client.post(reverse("haul-fleet-stage", args=(fleet_id,)), {
            "version": 1, "stage": "customer", "data": {"name": "Ikeja Industrial Depot"},
        }, format="json")
        self.assertEqual(customer.status_code, status.HTTP_200_OK, customer.data)
        self.assertEqual(customer.data["completed_steps"], 1)
        self.assertEqual(customer.data["next_step"], "route")
        resumed = self.client.get(reverse("haul-fleet-detail", args=(fleet_id,)))
        self.assertEqual(resumed.status_code, status.HTTP_200_OK)
        self.assertEqual(resumed.data["customer"]["name"], "Ikeja Industrial Depot")

        fleet = self.create_fleet()
        self.assertEqual(fleet["status"], Fleet.Status.READY)
        self.assertEqual(fleet["completed_steps"], 5)
        self.assertEqual(FleetAuditEvent.objects.filter(fleet__public_id=fleet["id"]).count(), 5)
        dispatch = self.client.post(reverse("haul-dispatch-list"), {
            "fleet_id": fleet["id"], "product": "AGO", "planned_quantity_litres": "45000.000",
            "scheduled_departure_at": (timezone.now() + timedelta(hours=2)).isoformat(),
        }, format="json")
        self.assertEqual(dispatch.status_code, status.HTTP_201_CREATED, dispatch.data)
        self.assertEqual(dispatch.data["fleet_reference"], fleet["reference"])

    def test_fleet_stage_order_and_tenant_isolation_fail_closed(self):
        created = self.client.post(reverse("haul-fleet-list"), {}, format="json")
        fleet_id = created.data["id"]
        skipped = self.client.post(reverse("haul-fleet-stage", args=(fleet_id,)), {
            "version": 1, "stage": "truck", "data": {"registration_number": "LAG-X", "capacity_litres": "1"},
        }, format="json")
        self.assertEqual(skipped.status_code, status.HTTP_409_CONFLICT)

        self.client.force_login(self.other_owner)
        self.assertEqual(self.client.get(reverse("haul-fleet-detail", args=(fleet_id,))).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.post(reverse("haul-fleet-stage", args=(fleet_id,)), {
            "version": 1, "stage": "customer", "data": {"name": "Forged"},
        }, format="json").status_code, status.HTTP_404_NOT_FOUND)
        listed = self.client.get(reverse("haul-fleet-list"))
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        self.assertEqual(listed.data, [])

    def test_complete_dispatch_workflow_qr_and_styled_export(self):
        created = self.create_dispatch(reference="DSP-ALPHA-001")
        dispatch_id = created.data["id"]
        version = created.data["version"]
        for kind, weight in (("tare", "14190.000"), ("gross", "48120.000")):
            response = self.client.post(reverse("haul-weighbridge-create", args=(dispatch_id,)), {
                "version": version, "kind": kind, "weight_kg": weight,
                "captured_at": timezone.now().isoformat(), "weighbridge_name": "Outbound Bridge 2",
                "ticket_number": f"WB-{kind.upper()}-001",
            }, format="json")
            self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
            version = response.data["version"]
            self.assertEqual(response.data["weighbridge_readings"][-1]["source"], "manual")

        waybill = self.client.post(reverse("haul-waybill-create", args=(dispatch_id,)), {"version": version, "number": "EWB-ALPHA-001"}, format="json")
        self.assertEqual(waybill.status_code, status.HTTP_201_CREATED, waybill.data)
        version = waybill.data["version"]
        qr = self.client.get(reverse("haul-waybill-qr", args=(dispatch_id,)))
        self.assertEqual(qr.status_code, status.HTTP_200_OK)
        self.assertEqual(qr["Content-Type"], "image/svg+xml")
        self.assertIn(b"<svg", qr.content)
        verify = self.client.get(reverse("haul-waybill-verify", args=(dispatch_id, waybill.data["waybill"]["verification_code"])))
        self.assertEqual(verify.status_code, status.HTTP_200_OK)
        self.assertTrue(verify.data["valid"])

        for action in ("dispatch", "start_trip", "arrive", "start_discharge"):
            response = self.transition(dispatch_id, action, version)
            self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
            version = response.data["version"]

        pod = self.client.post(reverse("haul-pod-create", args=(dispatch_id,)), {
            "version": version, "delivered_quantity_litres": "44920.000", "ullage_mm": "142.000",
            "observed_temperature_c": "30.500", "water_paste_result": "clear",
            "receiver_name": "Engr. F. Adeleke", "receiver_title": "Depot Manager",
            "receiver_acknowledged_at": timezone.now().isoformat(), "notes": "Discharge accepted",
        }, format="json")
        self.assertEqual(pod.status_code, status.HTTP_201_CREATED, pod.data)
        self.assertEqual(pod.data["status"], Dispatch.Status.DELIVERED)
        closed = self.transition(dispatch_id, "close", pod.data["version"], "Delivery documentation reconciled")
        self.assertEqual(closed.status_code, status.HTTP_200_OK, closed.data)
        self.assertEqual(closed.data["status"], Dispatch.Status.CLOSED)
        self.assertEqual(closed.data["allowed_actions"], ["export"])

        exported = self.client.get(reverse("haul-delivery-export", args=(dispatch_id,)))
        self.assertEqual(exported.status_code, status.HTTP_200_OK)
        document = b"".join(exported.streaming_content)
        self.assertTrue(document.startswith(b"%PDF-1.4"))
        self.assertIn(b"PROOF OF DELIVERY", document)
        self.assertIn(b"EWB-ALPHA-001", document)
        self.assertTrue(document.rstrip().endswith(b"%%EOF"))
        with self.assertRaises(DatabaseError), transaction.atomic():
            WeighbridgeReading.objects.filter(dispatch__public_id=dispatch_id).update(weight_kg="1")
        with self.assertRaises(DatabaseError), transaction.atomic():
            ProofOfDelivery.objects.filter(dispatch__public_id=dispatch_id).delete()
        with self.assertRaises(DatabaseError), transaction.atomic():
            HaulageAuditEvent.objects.filter(dispatch__public_id=dispatch_id).update(reason="changed")

    def test_two_tenant_read_write_search_export_and_reference_attempts_fail(self):
        created = self.create_dispatch(reference="ALPHA-SECRET-TRIP")
        dispatch_id = created.data["id"]
        alpha_truck_id = self.refs["truck"]
        self.client.force_login(self.other_owner)
        self.create_references()

        self.assertEqual(self.client.get(reverse("haul-dispatch-detail", args=(dispatch_id,))).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.patch(reverse("haul-dispatch-detail", args=(dispatch_id,)), {"version": 1, "product": "PMS"}, format="json").status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(reverse("haul-dispatch-detail", args=(dispatch_id,))).status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        search = self.client.get(reverse("haul-dispatch-list"), {"search": "ALPHA-SECRET-TRIP"})
        self.assertEqual(search.data["results"], [])
        self.assertEqual(self.client.post(reverse("haul-dispatch-transition", args=(dispatch_id, "dispatch")), {"version": 1, "reason": "forged"}, format="json").status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(reverse("haul-delivery-export", args=(dispatch_id,))).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(reverse("haul-waybill-qr", args=(dispatch_id,))).status_code, status.HTTP_404_NOT_FOUND)

        payload = {
            "customer_id": self.refs["customer"], "origin_id": self.refs["origin"], "destination_id": self.refs["destination"],
            "truck_id": alpha_truck_id, "trailer_id": self.refs["trailer"], "driver_id": self.refs["driver"],
            "product": "AGO", "planned_quantity_litres": "1000.000", "scheduled_departure_at": timezone.now().isoformat(),
        }
        forged = self.client.post(reverse("haul-dispatch-list"), payload, format="json")
        self.assertEqual(forged.status_code, status.HTTP_400_BAD_REQUEST)

    def test_gross_must_exceed_tare_and_dispatch_requires_waybill(self):
        created = self.create_dispatch()
        dispatch_id, version = created.data["id"], created.data["version"]
        for kind, weight in (("tare", "15000.000"), ("gross", "14000.000")):
            response = self.client.post(reverse("haul-weighbridge-create", args=(dispatch_id,)), {
                "version": version, "kind": kind, "weight_kg": weight, "captured_at": timezone.now().isoformat(), "weighbridge_name": "Manual bridge",
            }, format="json")
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            version = response.data["version"]
        waybill = self.client.post(reverse("haul-waybill-create", args=(dispatch_id,)), {"version": version}, format="json")
        self.assertEqual(waybill.status_code, status.HTTP_400_BAD_REQUEST)
        transition = self.transition(dispatch_id, "dispatch", version)
        self.assertEqual(transition.status_code, status.HTTP_409_CONFLICT)

    def test_viewer_cannot_create_master_data_or_dispatch(self):
        self.client.force_login(self.viewer)
        self.assertEqual(self.client.post(reverse("haul-truck-list"), {"registration_number": "NO", "capacity_litres": "1"}, format="json").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.post(reverse("haul-fleet-list"), {}, format="json").status_code, status.HTTP_403_FORBIDDEN)
        response = self.client.post(reverse("haul-dispatch-list"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
