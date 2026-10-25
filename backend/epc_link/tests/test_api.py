from decimal import Decimal
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from epc_link.models import (
    ApprovedVendor,
    MaterialIssueSlip,
    MaterialRequisition,
    PipeYardItem,
)
from organizations.models import Membership, Organization

User = get_user_model()


class EpcLinkAPITests(APITestCase):
    def setUp(self):
        self.alpha_user = User.objects.create_user(username="epc-alpha@test.local", email="epc-alpha@test.local", password="password")
        self.bravo_user = User.objects.create_user(username="epc-bravo@test.local", email="epc-bravo@test.local", password="password")
        self.alpha = Organization.objects.create(name="Alpha EPC Solutions Ltd", slug="alpha-epc")
        self.bravo = Organization.objects.create(name="Bravo Engineering Ltd", slug="bravo-epc")
        Membership.objects.create(user=self.alpha_user, organization=self.alpha, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo, role=Membership.Role.OWNER)
        self.client.force_login(self.alpha_user)

        # Alpha Vendor
        self.alpha_vendor = ApprovedVendor.objects.create(
            organization=self.alpha,
            vendor_code="VND-0001",
            vendor_name="Tenaris Global Services Nigeria",
            category=ApprovedVendor.Category.TUBULARS,
            status=ApprovedVendor.Status.ACTIVE,
            audit_rating=ApprovedVendor.AuditRating.GRADE_A,
            nogic_jqs_id="NOGIC-VND-9921",
            nuprc_permit_ref="NUPRC/PTS/2026/881",
        )

        # Bravo Vendor
        self.bravo_vendor = ApprovedVendor.objects.create(
            organization=self.bravo,
            vendor_code="VND-0002",
            vendor_name="Vallourec Oil & Gas",
            category=ApprovedVendor.Category.TUBULARS,
            status=ApprovedVendor.Status.ACTIVE,
            nogic_jqs_id="NOGIC-VND-4412",
        )

        # Alpha Requisition
        self.alpha_req = MaterialRequisition.objects.create(
            organization=self.alpha,
            requisition_number="MR-202610-0001",
            project_name="Bonga North Subsea Flowline Tie-back",
            client_name="Shell SNEPCo",
            wbs_code="WBS-BN-SUBSEA-04",
            priority=MaterialRequisition.Priority.URGENT,
            status=MaterialRequisition.Status.DRAFT,
            required_date="2026-11-15",
            delivery_location="Onne Free Zone Pipe Yard Bay 3",
            estimated_cost_minor=8500000000,
            currency="NGN",
            requested_by=self.alpha_user,
        )

        # Alpha Pipe Yard Item
        self.alpha_item = PipeYardItem.objects.create(
            organization=self.alpha,
            item_tag="PY-202610-0001",
            material_type=PipeYardItem.MaterialType.LINE_PIPE,
            grade_specification="API 5L X65 PSL2 DNV-ST-F101",
            outer_diameter_inches=Decimal("12.750"),
            wall_thickness_mm=Decimal("19.05"),
            schedule="SCH 80",
            length_meters=Decimal("12.20"),
            quantity=Decimal("50.00"),
            unit_of_measure="joints",
            heat_number="HT-772819-B",
            mill_manufacturer="Tenaris Confab Steel Mill",
            mtc_number="MTC-EN10204-3.1-9942",
            mtc_type=PipeYardItem.MtcType.EN_10204_3_1,
            yield_strength_mpa=Decimal("525.00"),
            tensile_strength_mpa=Decimal("620.00"),
            impact_test_joules=Decimal("185.00"),
            yard_location="Onne Pipe Yard",
            bay_rack_position="Bay 4 - Rack 2 - Tier 1",
            qr_tag="OFFSHORA-EPC-PY-202610-0001",
            status=PipeYardItem.Status.AVAILABLE,
            vendor=self.alpha_vendor,
            unit_cost_minor=120000000,
            currency="NGN",
            nigerian_content_percent=Decimal("85.00"),
        )

    def test_two_tenant_vendor_and_requisition_isolation(self):
        # Alpha lists vendors: should only see Tenaris
        res = self.client.get(reverse("epc_link:vendors-list-create"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        vendor_codes = [v["vendor_code"] for v in res.data["results"]]
        self.assertIn("VND-0001", vendor_codes)
        self.assertNotIn("VND-0002", vendor_codes)

        # Alpha attempts to get Bravo vendor by public_id: 404
        res = self.client.get(reverse("epc_link:vendors-detail", kwargs={"public_id": self.bravo_vendor.public_id}))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Bravo lists vendors: should only see Vallourec
        self.client.force_login(self.bravo_user)
        res_bravo = self.client.get(reverse("epc_link:vendors-list-create"))
        self.assertEqual(res_bravo.status_code, status.HTTP_200_OK)
        vendor_codes = [v["vendor_code"] for v in res_bravo.data["results"]]
        self.assertIn("VND-0002", vendor_codes)
        self.assertNotIn("VND-0001", vendor_codes)

    def test_create_material_requisition(self):
        payload = {
            "project_name": "NLNG Train 7 Cryogenic Pipework",
            "client_name": "SCD JV (Saipem/Chiyoda/Daewoo)",
            "wbs_code=":"WBS-T7-CRYO-09",
            "priority": "routine",
            "required_date": "2026-12-01",
            "delivery_location": "Bonny Island Train 7 Construction Dock",
            "estimated_cost_minor": 15000000000,
            "currency": "NGN",
            "notes": "Requires EN 10204 3.2 low temperature ASTM A333 Grade 6 pipes",
        }
        res = self.client.post(reverse("epc_link:requisitions-list-create"), data=payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["project_name"], "NLNG Train 7 Cryogenic Pipework")
        self.assertEqual(res.data["status"], "draft")
        self.assertEqual(res.data["version"], 1)

    def test_requisition_lifecycle_transitions_and_version_conflict(self):
        # Step 1: draft -> submit -> submitted
        res = self.client.post(
            reverse("epc_link:requisitions-transition", kwargs={"public_id": self.alpha_req.public_id, "action": "submit"}),
            data={"version": self.alpha_req.version, "reason": "Engineering specs approved by lead piping engineer"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "submitted")
        self.assertEqual(res.data["version"], 2)

        # Step 2: Attempt approve with stale version 1 -> 409 Conflict
        res_conflict = self.client.post(
            reverse("epc_link:requisitions-transition", kwargs={"public_id": self.alpha_req.public_id, "action": "approve"}),
            data={"version": 1, "reason": "Stale attempt"},
            format="json",
        )
        self.assertEqual(res_conflict.status_code, status.HTTP_409_CONFLICT)

        # Step 3: Approve with version 2
        res_approved = self.client.post(
            reverse("epc_link:requisitions-transition", kwargs={"public_id": self.alpha_req.public_id, "action": "approve"}),
            data={"version": 2, "reason": "Approved for yard issue and dispatch"},
            format="json",
        )
        self.assertEqual(res_approved.status_code, status.HTTP_200_OK)
        self.assertEqual(res_approved.data["status"], "approved")
        self.assertIsNotNone(res_approved.data["approved_at"])

    def test_create_pipe_yard_item_and_metallurgy_traceability(self):
        payload = {
            "material_type": "line_pipe",
            "grade_specification": "API 5L X70M PSL2",
            "outer_diameter_inches": "24.000",
            "wall_thickness_mm": "25.40",
            "schedule": "SCH 80",
            "length_meters": "12.00",
            "quantity": "30.00",
            "unit_of_measure": "joints",
            "heat_number": "HT-883901-C",
            "mill_manufacturer": "Salzgitter Mannesmann Line Pipe",
            "mtc_number": "MTC-EN10204-3.2-4412",
            "mtc_type": "en_10204_3_2",
            "yield_strength_mpa": "580.00",
            "tensile_strength_mpa": "690.00",
            "impact_test_joules": "210.00",
            "yard_location": "Port Harcourt Federal Lighter Terminal",
            "bay_rack_position": "Bay 1 - Rack A",
            "vendor_id": str(self.alpha_vendor.public_id),
            "unit_cost_minor": 450000000,
            "currency": "NGN",
            "nigerian_content_percent": "70.00",
        }
        res = self.client.post(reverse("epc_link:yard-items-list-create"), data=payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["heat_number"], "HT-883901-C")
        self.assertEqual(res.data["mtc_type"], "en_10204_3_2")
        self.assertTrue(res.data["qr_tag"].startswith("OFFSHORA-EPC-"))

    def test_issue_materials_against_approved_requisition(self):
        # First approve the requisition
        self.alpha_req.status = MaterialRequisition.Status.APPROVED
        self.alpha_req.save()

        # Issue 15 joints out of 50 available
        payload = {
            "requisition_id": str(self.alpha_req.public_id),
            "issued_to": "Engr. Patrick Bassey (Offshore Installation Manager)",
            "contractor_name": "Subsea 7 West Africa Ltd",
            "issued_date": "2026-10-25",
            "receiver_signature_ref": "SIG-SS7-PBASSEY-9901",
            "notes": "Loaded onto North Sea Giant pipelay barge",
            "items": [
                {
                    "yard_item_id": str(self.alpha_item.public_id),
                    "quantity_issued": "15.00",
                    "notes": "Joints 01 to 15 with bevel protectors intact",
                }
            ],
        }
        res = self.client.post(reverse("epc_link:issue-slips-list-create"), data=payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["contractor_name"], "Subsea 7 West Africa Ltd")
        self.assertEqual(len(res.data["items"]), 1)
        self.assertEqual(res.data["items"][0]["quantity_issued"], "15.00")

        # Verify yard item quantity decremented from 50 to 35
        self.alpha_item.refresh_from_db()
        self.assertEqual(self.alpha_item.quantity, Decimal("35.00"))
        self.assertEqual(self.alpha_item.status, PipeYardItem.Status.AVAILABLE)

    def test_issue_materials_fails_if_quantity_exceeds_stock(self):
        self.alpha_req.status = MaterialRequisition.Status.APPROVED
        self.alpha_req.save()

        # Attempt to issue 60 joints when only 50 available
        payload = {
            "requisition_id": str(self.alpha_req.public_id),
            "issued_to": "Engr. Bassey",
            "contractor_name": "Subsea 7",
            "items": [
                {
                    "yard_item_id": str(self.alpha_item.public_id),
                    "quantity_issued": "60.00",
                }
            ],
        }
        res = self.client.post(reverse("epc_link:issue-slips-list-create"), data=payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Insufficient", str(res.data))

    def test_nigerian_content_report_and_tenant_isolation(self):
        res = self.client.get(reverse("epc_link:nigerian-content-report"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["inventory_summary"]["total_unique_tags"], 1)
        self.assertEqual(res.data["inventory_summary"]["overall_nigerian_content_percent"], "85.00")
        self.assertEqual(res.data["vendor_governance"]["total_approved_vendors"], 1)
        self.assertEqual(res.data["vendor_governance"]["nogic_jqs_registered_vendors"], 1)

        # Bravo sees only Bravo metrics (0 items, 1 vendor)
        self.client.force_login(self.bravo_user)
        res_bravo = self.client.get(reverse("epc_link:nigerian-content-report"))
        self.assertEqual(res_bravo.status_code, status.HTTP_200_OK)
        self.assertEqual(res_bravo.data["inventory_summary"]["total_unique_tags"], 0)
        self.assertEqual(res_bravo.data["vendor_governance"]["total_approved_vendors"], 1)
