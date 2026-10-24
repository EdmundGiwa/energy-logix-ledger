from decimal import Decimal
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from organizations.models import Membership, Organization
from refinery_link.models import (
    BatchQualityCertificate,
    DepotTank,
    GantryMeterTicket,
    OfftakeAppointment,
    TankGaugeDip,
    Terminal,
)


User = get_user_model()


class RefineryLinkAPITests(APITestCase):
    def setUp(self):
        self.alpha_user = User.objects.create_user(username="refinery-alpha@test.local", email="refinery-alpha@test.local", password="password")
        self.bravo_user = User.objects.create_user(username="refinery-bravo@test.local", email="refinery-bravo@test.local", password="password")
        self.alpha = Organization.objects.create(name="Alpha Depot", slug="alpha-depot")
        self.bravo = Organization.objects.create(name="Bravo Depot", slug="bravo-depot")
        Membership.objects.create(user=self.alpha_user, organization=self.alpha, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo, role=Membership.Role.OWNER)
        self.client.force_login(self.alpha_user)

        self.alpha_terminal = Terminal.objects.create(
            organization=self.alpha,
            code="LEKKI-01",
            name="Lekki Integrated Terminal",
            location="Lekki Free Zone, Lagos",
        )
        self.bravo_terminal = Terminal.objects.create(
            organization=self.bravo,
            code="IBADAN-01",
            name="Ibadan Depot",
            location="Ibadan, Oyo State",
        )
        self.alpha_tank = DepotTank.objects.create(
            organization=self.alpha,
            terminal=self.alpha_terminal,
            tank_number="TK-14",
            product_type=DepotTank.ProductType.AGO,
            nominal_capacity_litres=Decimal("20000000.00"),
            safe_fill_level_mm=12000,
            current_status=DepotTank.Status.DISPENSING,
        )

    def test_appointment_lifecycle_and_version_locking(self):
        # 1. Create Appointment
        create_res = self.client.post(
            reverse("refinery-appointment-list"),
            {
                "terminal_id": str(self.alpha_terminal.public_id),
                "truck_plate": "NG-LAG-4418",
                "driver_name": "S. Aliu",
                "product_type": "ago",
                "nominated_volume_litres": "45000.00",
                "holding_park_slot": "Bay B-19",
                "rfid_tag": "RF-8821",
                "e_callup_reference": "ECU-2026-1142",
            },
            format="json",
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED, create_res.data)
        appt_id = create_res.data["id"]
        version = create_res.data["version"]
        self.assertEqual(create_res.data["status"], "scheduled")

        # 2. Check in at holding park
        checkin_res = self.client.post(
            reverse("refinery-appointment-transition", args=[appt_id, "check_in"]),
            {"version": version, "reason": "Truck arrived at holding park"},
            format="json",
        )
        self.assertEqual(checkin_res.status_code, status.HTTP_200_OK)
        self.assertEqual(checkin_res.data["status"], "checked_in")
        self.assertIsNotNone(checkin_res.data["checked_in_at"])
        version = checkin_res.data["version"]

        # 3. Optimistic concurrency conflict test
        stale_res = self.client.post(
            reverse("refinery-appointment-transition", args=[appt_id, "call_up"]),
            {"version": version - 1, "reason": "Stale attempt"},
            format="json",
        )
        self.assertEqual(stale_res.status_code, status.HTTP_409_CONFLICT)

        # 4. Call up to gantry entry
        callup_res = self.client.post(
            reverse("refinery-appointment-transition", args=[appt_id, "call_up"]),
            {"version": version, "reason": "Cleared peak-hour restriction"},
            format="json",
        )
        self.assertEqual(callup_res.status_code, status.HTTP_200_OK)
        self.assertEqual(callup_res.data["status"], "called_up")
        version = callup_res.data["version"]

        # 5. Detail inspection includes audit trail
        detail_res = self.client.get(reverse("refinery-appointment-detail", args=[appt_id]))
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(detail_res.data["audit_events"]) >= 3)

    def test_cross_tenant_isolation_fails_closed(self):
        # Bravo tries to see Alpha terminal
        self.client.force_login(self.bravo_user)
        list_res = self.client.get(reverse("refinery-terminal-list"))
        codes = [t["code"] for t in list_res.data]
        self.assertNotIn("LEKKI-01", codes)
        self.assertIn("IBADAN-01", codes)

        # Bravo tries to create appointment on Alpha terminal
        create_res = self.client.post(
            reverse("refinery-appointment-list"),
            {
                "terminal_id": str(self.alpha_terminal.public_id),
                "truck_plate": "FORGED-TRUCK",
                "driver_name": "Intruder",
                "product_type": "ago",
                "nominated_volume_litres": "30000.00",
            },
            format="json",
        )
        self.assertEqual(create_res.status_code, status.HTTP_404_NOT_FOUND)

    def test_tank_gauge_dip_recording(self):
        dip_res = self.client.post(
            reverse("refinery-dip-list"),
            {
                "tank_id": str(self.alpha_tank.public_id),
                "dip_type": "automated",
                "observed_level_mm": "11420.00",
                "water_cut_mm": "0.00",
                "temperature_c": "28.50",
                "observed_density_kg_m3": "845.20",
                "gross_observed_volume_litres": "12500000.00",
                "net_standard_volume_litres": "12450000.00",
                "operator_name": "T. Babatunde",
                "notes": "ATG dip reading verified",
            },
            format="json",
        )
        self.assertEqual(dip_res.status_code, status.HTTP_201_CREATED, dip_res.data)
        self.assertEqual(dip_res.data["observed_level_mm"], "11420.00")
        self.assertEqual(dip_res.data["tank_number"], "TK-14")

    def test_gantry_meter_ticket_variance_calculation(self):
        # Create appointment
        appt = OfftakeAppointment.objects.create(
            organization=self.alpha,
            terminal=self.alpha_terminal,
            reference="APPT-RECON-01",
            truck_plate="NG-ABJ-1234",
            driver_name="M. Danjuma",
            product_type="ago",
            nominated_volume_litres=Decimal("45000.00"),
            created_by=self.alpha_user,
            updated_by=self.alpha_user,
            scheduled_at="2026-10-24T10:00:00Z",
        )

        ticket_res = self.client.post(
            reverse("refinery-ticket-list"),
            {
                "appointment_id": str(appt.public_id),
                "tank_id": str(self.alpha_tank.public_id),
                "meter_id": "BAY-04-ACCULOAD",
                "batch_start_reading": "100000.00",
                "batch_end_reading": "145030.00",
                "gross_volume_litres": "45030.00",
                "net_volume_litres": "45025.00",
                "temperature_c": "27.50",
                "density_at_15c": "845.00",
            },
            format="json",
        )
        self.assertEqual(ticket_res.status_code, status.HTTP_201_CREATED, ticket_res.data)
        # 45025 - 45000 = +25 litres. 25/45000 = +0.055% (well within 0.5% tolerance) -> reconciled
        self.assertEqual(ticket_res.data["status"], "reconciled")
        self.assertEqual(Decimal(ticket_res.data["variance_litres"]), Decimal("25.00"))

    def test_quality_certificate_nmdpra_compliance_validation(self):
        # Compliant AGO: sulphur 9.8 ppm (< 50 ppm), flash 66C (>= 60C)
        qc_res = self.client.post(
            reverse("refinery-qc-list"),
            {
                "product_type": "ago",
                "batch_number": "DNG-AGO-2026-B88",
                "density_at_15c": "845.20",
                "flash_point_c": "66.00",
                "sulphur_ppm": "9.80",
                "laboratory_name": "Dangote QA Central Lab",
                "authorized_chemist": "Dr. O. Adeleke",
            },
            format="json",
        )
        self.assertEqual(qc_res.status_code, status.HTTP_201_CREATED, qc_res.data)
        self.assertTrue(qc_res.data["is_compliant_nmdpra"])

        # Non-compliant AGO: sulphur 120 ppm (> 50 ppm limit)
        non_compliant_res = self.client.post(
            reverse("refinery-qc-list"),
            {
                "product_type": "ago",
                "batch_number": "DIRTY-AGO-01",
                "density_at_15c": "860.00",
                "flash_point_c": "55.00",
                "sulphur_ppm": "120.00",
                "laboratory_name": "Off-spec Lab",
                "authorized_chemist": "Chemist X",
            },
            format="json",
        )
        self.assertEqual(non_compliant_res.status_code, status.HTTP_201_CREATED)
        self.assertFalse(non_compliant_res.data["is_compliant_nmdpra"])
