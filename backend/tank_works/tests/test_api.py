from decimal import Decimal
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from organizations.models import Membership, Organization
from tank_works.models import (
    CoatingInspection,
    CrewEquipmentUtilization,
    SludgeWasteManifest,
    TankFieldJob,
)

User = get_user_model()


class TankWorksAPITests(APITestCase):
    def setUp(self):
        self.alpha_user = User.objects.create_user(username="tank-alpha@test.local", email="tank-alpha@test.local", password="password")
        self.bravo_user = User.objects.create_user(username="tank-bravo@test.local", email="tank-bravo@test.local", password="password")
        self.alpha = Organization.objects.create(name="Alpha Tank Cleaning Ltd", slug="alpha-tank")
        self.bravo = Organization.objects.create(name="Bravo Industrial Services", slug="bravo-tank")
        Membership.objects.create(user=self.alpha_user, organization=self.alpha, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo, role=Membership.Role.OWNER)
        self.client.force_login(self.alpha_user)

        self.alpha_job = TankFieldJob.objects.create(
            organization=self.alpha,
            job_number="TW-202610-0001",
            client_name="Shell Bonny Terminal",
            terminal_or_facility="Bonny Crude Oil Terminal",
            tank_identifier="TK-101-CRUDE",
            tank_capacity_m3=Decimal("50000.00"),
            scope_of_work=TankFieldJob.ScopeOfWork.EVACUATION_CLEANING,
            status=TankFieldJob.Status.DRAFT,
            estimated_cost_minor=4500000000,
            currency="NGN",
            created_by=self.alpha_user,
            updated_by=self.alpha_user,
        )

        self.bravo_job = TankFieldJob.objects.create(
            organization=self.bravo,
            job_number="TW-202610-0002",
            client_name="Chevron Escravos",
            terminal_or_facility="Escravos Tank Farm",
            tank_identifier="TK-ESC-04",
            tank_capacity_m3=Decimal("35000.00"),
            scope_of_work=TankFieldJob.ScopeOfWork.BLASTING_COATING,
            status=TankFieldJob.Status.ACTIVE,
            safepass_permit_ref="PTW-ESC-9921",
            gas_test_cleared=True,
            estimated_cost_minor=2800000000,
            currency="NGN",
            created_by=self.bravo_user,
            updated_by=self.bravo_user,
        )

    def test_two_tenant_job_isolation(self):
        # Alpha lists jobs: should only see TK-101-CRUDE
        res = self.client.get(reverse("tank_works:jobs-list-create"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        job_numbers = [item["job_number"] for item in res.data["results"]]
        self.assertIn("TW-202610-0001", job_numbers)
        self.assertNotIn("TW-202610-0002", job_numbers)

        # Alpha attempts to get Bravo job by public_id: 404
        res = self.client.get(reverse("tank_works:jobs-detail", kwargs={"public_id": self.bravo_job.public_id}))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Bravo lists jobs: should only see TK-ESC-04
        self.client.force_login(self.bravo_user)
        res = self.client.get(reverse("tank_works:jobs-list-create"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        job_numbers = [item["job_number"] for item in res.data["results"]]
        self.assertIn("TW-202610-0002", job_numbers)
        self.assertNotIn("TW-202610-0001", job_numbers)

    def test_create_tank_field_job(self):
        payload = {
            "client_name": "TotalEnergies Amenam",
            "terminal_or_facility": "Amenam FSO Terminal",
            "tank_identifier": "CARGO-TANK-3P",
            "tank_capacity_m3": "25000.00",
            "scope_of_work": "full_refurb",
            "estimated_cost_minor": 6000000000,
            "currency": "NGN",
            "notes": "Full blasting to SA 2.5 and 3-coat epoxy system",
        }
        res = self.client.post(reverse("tank_works:jobs-list-create"), data=payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["tank_identifier"], "CARGO-TANK-3P")
        self.assertEqual(res.data["status"], "draft")
        self.assertEqual(res.data["version"], 1)

    def test_safepass_confined_space_interlock_on_transition(self):
        # Step 1: Transition draft -> submit_permit -> permit_pending
        res = self.client.post(
            reverse("tank_works:jobs-transition", kwargs={"public_id": self.alpha_job.public_id, "action": "submit_permit"}),
            data={"version": self.alpha_job.version, "reason": "PTW documentation submitted to HSE"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "permit_pending")
        self.assertEqual(res.data["version"], 2)

        # Step 2: Attempt activate WITHOUT gas test clearance -> Must fail validation
        res_fail = self.client.post(
            reverse("tank_works:jobs-transition", kwargs={"public_id": self.alpha_job.public_id, "action": "activate"}),
            data={
                "version": 2,
                "permit_data": {
                    "safepass_permit_ref": "PTW-BONNY-CSE-001",
                    "gas_test_cleared": False,
                },
            },
            format="json",
        )
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("gas test", str(res_fail.data).lower())

        # Step 3: Attempt activate with stale version -> Must return 409 Conflict
        res_conflict = self.client.post(
            reverse("tank_works:jobs-transition", kwargs={"public_id": self.alpha_job.public_id, "action": "activate"}),
            data={
                "version": 1,
                "permit_data": {
                    "safepass_permit_ref": "PTW-BONNY-CSE-001",
                    "gas_test_cleared": True,
                },
            },
            format="json",
        )
        self.assertEqual(res_conflict.status_code, status.HTTP_409_CONFLICT)

        # Step 4: Successfully activate with cleared gas test and permit ref
        res_success = self.client.post(
            reverse("tank_works:jobs-transition", kwargs={"public_id": self.alpha_job.public_id, "action": "activate"}),
            data={
                "version": 2,
                "permit_data": {
                    "safepass_permit_ref": "PTW-BONNY-CSE-001",
                    "gas_test_cleared": True,
                },
                "reason": "SafePass permit authorized and gas test reading 0.0% LEL, 20.9% O2",
            },
            format="json",
        )
        self.assertEqual(res_success.status_code, status.HTTP_200_OK)
        self.assertEqual(res_success.data["status"], "active")
        self.assertTrue(res_success.data["gas_test_cleared"])
        self.assertEqual(res_success.data["safepass_permit_ref"], "PTW-BONNY-CSE-001")
        self.assertIsNotNone(res_success.data["started_at"])

    def test_record_sludge_waste_manifest_and_isolation(self):
        # Alpha records waste manifest
        payload = {
            "job_id": str(self.alpha_job.public_id),
            "waste_classification": "hydrocarbon_sludge",
            "quantity": "45.50",
            "unit_of_measure": "metric_tonnes",
            "transporter_name": "Dangote Environmental Logistics",
            "vehicle_registration": "RSH-492-XA",
            "driver_name": "Musa Ibrahim",
            "nesrea_permit_number": "NESREA/HAZ/2026/099",
            "disposal_facility": "Port Harcourt Thermal Desorption Plant",
            "treatment_method": "Thermal Desorption & TDU Ash Solidification",
            "is_consignment_signed": True,
        }
        res = self.client.post(reverse("tank_works:manifests-list-create"), data=payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["transporter_name"], "Dangote Environmental Logistics")
        self.assertEqual(res.data["quantity"], "45.50")

        # Bravo attempts to record waste against Alpha job: 404 (scoped job not found)
        self.client.force_login(self.bravo_user)
        res_bravo = self.client.post(reverse("tank_works:manifests-list-create"), data=payload, format="json")
        self.assertEqual(res_bravo.status_code, status.HTTP_404_NOT_FOUND)

    def test_record_coating_inspection_and_dft_validation(self):
        payload = {
            "job_id": str(self.alpha_job.public_id),
            "surface_location": "Internal Shell Course 1 & 2",
            "blast_standard": "SSPC-SP 10 / NACE No. 2",
            "surface_profile_microns": "75.00",
            "coating_system": "Jotun Tankguard Plus (2 coats @ 150µm)",
            "specified_dft_microns": 300,
            "measured_min_dft_microns": 280,
            "measured_avg_dft_microns": 320,
            "measured_max_dft_microns": 360,
            "adhesion_test_method": "ASTM D4541 Dolly Pull-off",
            "adhesion_result_mpa": "14.50",
            "inspector_name": "Engr. Nnamdi Okon",
            "nace_level": "NACE / AMPP Level 3 Certified",
            "notes": "DFT complies with SSPC-PA 2 80-20 rule.",
        }
        res = self.client.post(reverse("tank_works:inspections-list-create"), data=payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data["dft_passed"])
        self.assertTrue(res.data["passed"])

    def test_log_crew_utilization(self):
        payload = {
            "job_id": str(self.alpha_job.public_id),
            "entry_date": "2026-10-25",
            "personnel_role": "Blaster / Painter Crew",
            "headcount": 6,
            "man_hours": "60.00",
            "equipment_description": "Ingersoll Rand 750 CFM Compressor & Blast Pot",
            "equipment_hours": "9.50",
            "consumables_used": "50 bags Copper Slag Grit, 40L Jotun Thinner #17",
        }
        res = self.client.post(reverse("tank_works:utilization-list-create"), data=payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["personnel_role"], "Blaster / Painter Crew")
        self.assertEqual(res.data["man_hours"], "60.00")

    def test_tenant_summary_statistics(self):
        # Add sample data for Alpha
        SludgeWasteManifest.objects.create(
            organization=self.alpha,
            job=self.alpha_job,
            manifest_number="SWM-202610-0001",
            waste_classification=SludgeWasteManifest.WasteClassification.HYDROCARBON_SLUDGE,
            quantity=Decimal("30.00"),
            transporter_name="Alpha Haulers",
            vehicle_registration="ABC-123-XY",
            driver_name="Audu Bello",
            disposal_facility="PH Plant",
        )
        CoatingInspection.objects.create(
            organization=self.alpha,
            job=self.alpha_job,
            surface_location="Bottom Floor Plates",
            blast_standard="SSPC-SP 10",
            surface_profile_microns=Decimal("65.00"),
            coating_system="Epoxy Phenolic",
            specified_dft_microns=300,
            measured_min_dft_microns=290,
            measured_avg_dft_microns=315,
            measured_max_dft_microns=340,
            dft_passed=True,
            passed=True,
            inspector_name="Engr. K. Cole",
        )
        CrewEquipmentUtilization.objects.create(
            organization=self.alpha,
            job=self.alpha_job,
            entry_date="2026-10-25",
            personnel_role="Scaffolding Riggers",
            headcount=4,
            man_hours=Decimal("32.00"),
            equipment_description="Ringlock System Scaffolding",
            equipment_hours=Decimal("8.00"),
        )

        res = self.client.get(reverse("tank_works:summary"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["total_jobs"], 1)
        self.assertEqual(res.data["total_waste_evacuated_qty"], "30.00")
        self.assertEqual(res.data["total_coating_inspections"], 1)
        self.assertEqual(res.data["passed_coating_inspections"], 1)
        self.assertEqual(res.data["total_man_hours"], "32.00")

        # Bravo sees only Bravo stats (0 waste, 0 inspections, 0 man-hours)
        self.client.force_login(self.bravo_user)
        res_bravo = self.client.get(reverse("tank_works:summary"))
        self.assertEqual(res_bravo.status_code, status.HTTP_200_OK)
        self.assertEqual(res_bravo.data["total_jobs"], 1)
        self.assertEqual(res_bravo.data["active_jobs"], 1)
        self.assertEqual(res_bravo.data["total_waste_evacuated_qty"], "0.00")
        self.assertEqual(res_bravo.data["total_coating_inspections"], 0)
        self.assertEqual(res_bravo.data["total_man_hours"], "0.00")
