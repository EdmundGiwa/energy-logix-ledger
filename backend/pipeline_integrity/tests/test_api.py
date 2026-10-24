from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from organizations.models import Membership, Organization
from pipeline_integrity.models import CPSurveyPoint, InspectionRecord, PipelineAsset, ROWObservation


class PipelineIntegrityAPITests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.alpha_user = User.objects.create_user(username="pipe-alpha@test.local", email="pipe-alpha@test.local", password="password")
        self.bravo_user = User.objects.create_user(username="pipe-bravo@test.local", email="pipe-bravo@test.local", password="password")
        self.alpha = Organization.objects.create(name="Alpha Pipeline", slug="pipe-alpha")
        self.bravo = Organization.objects.create(name="Bravo Pipeline", slug="pipe-bravo")
        Membership.objects.create(user=self.alpha_user, organization=self.alpha, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo, role=Membership.Role.OWNER)
        self.client.force_login(self.alpha_user)

    def create_asset(self, organization=None, reference="ASSET-001"):
        return PipelineAsset.objects.create(
            organization=organization or self.alpha,
            reference=reference,
            name="Escravos Trunkline",
            fluid_type=PipelineAsset.FluidType.LIQUID,
            governing_code="ASME B31.4",
        )

    def test_pig_run_lifecycle_is_version_checked_and_audited(self):
        asset = self.create_asset()
        created = self.client.post(reverse("pipeline-pig-run-list"), {
            "asset_id": str(asset.public_id), "pig_type": "Intelligent MFL/UT", "launcher_kp": "0.000", "receiver_kp": "48.200",
        }, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
        pig_id = created.data["id"]
        launched = self.client.post(reverse("pipeline-pig-run-transition", args=(pig_id, "launch")), {"version": 1, "reason": "Launcher checks complete"}, format="json")
        self.assertEqual((launched.status_code, launched.data["status"]), (status.HTTP_200_OK, "launched"))
        stale = self.client.post(reverse("pipeline-pig-run-transition", args=(pig_id, "start_transit")), {"version": 1, "reason": "Stale request"}, format="json")
        self.assertEqual(stale.status_code, status.HTTP_409_CONFLICT)
        transit = self.client.post(reverse("pipeline-pig-run-transition", args=(pig_id, "start_transit")), {"version": 2, "reason": "Tracking beacon active"}, format="json")
        self.assertEqual(transit.data["status"], "in_transit")
        detail = self.client.get(reverse("pipeline-pig-run-detail", args=(pig_id,)))
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(len(detail.data["audit_events"]), 3)

    def test_hydrotest_completion_requires_recorded_pressure_drop(self):
        asset = self.create_asset()
        created = self.client.post(reverse("pipeline-hydrotest-list"), {
            "asset_id": str(asset.public_id), "test_pressure_bar": "142.400", "hold_duration_minutes": 1440,
        }, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
        test_id = created.data["id"]
        started = self.client.post(reverse("pipeline-hydrotest-transition", args=(test_id, "start")), {"version": 1, "reason": "Test started"}, format="json")
        self.assertEqual(started.data["status"], "in_progress")
        failed = self.client.post(reverse("pipeline-hydrotest-transition", args=(test_id, "fail")), {"version": 2, "reason": "No result yet"}, format="json")
        self.assertEqual(failed.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cross_tenant_asset_and_record_access_fails_closed(self):
        asset = self.create_asset(self.bravo, "BRAVO-SECRET")
        self.assertEqual(self.client.get(reverse("pipeline-asset-list"), {"search": "BRAVO-SECRET"}).data["results"], [])
        self.assertEqual(self.client.post(reverse("pipeline-pig-run-list"), {
            "asset_id": str(asset.public_id), "pig_type": "Scraper", "launcher_kp": "0", "receiver_kp": "1",
        }, format="json").status_code, status.HTTP_404_NOT_FOUND)

    def test_inspection_cp_and_row_records_are_tenant_scoped(self):
        asset = self.create_asset()
        inspection = self.client.post(reverse("pipeline-inspection-list"), {
            "asset_id": str(asset.public_id), "inspection_type": "ut", "subject_reference": "KP 12.400",
            "nominal_wall_thickness_mm": "12.000", "measured_wall_thickness_mm": "10.800",
            "corrosion_rate_mm_per_year": "0.1200", "remaining_life_years": "18.500",
            "inspected_at": "2026-10-20T10:00:00Z", "inspector_name": "A. Bello", "result": "requires_review",
        }, format="json")
        self.assertEqual(inspection.status_code, status.HTTP_201_CREATED, inspection.data)
        cp = self.client.post(reverse("pipeline-cp-survey-point-list"), {
            "asset_id": str(asset.public_id), "kp": "12.400", "potential_mv": "-850.000",
            "surveyed_at": "2026-10-20T11:00:00Z", "surveyor_name": "C. Eze",
        }, format="json")
        self.assertEqual(cp.status_code, status.HTTP_201_CREATED, cp.data)
        row = self.client.post(reverse("pipeline-row-observation-list"), {
            "asset_id": str(asset.public_id), "kp": "12.500", "category": "Third-party encroachment",
            "severity": "high", "observed_at": "2026-10-20T12:00:00Z", "observer_name": "E. Okon",
            "description": "Unauthorised excavation within the right-of-way.",
        }, format="json")
        self.assertEqual(row.status_code, status.HTTP_201_CREATED, row.data)
        self.assertEqual(self.client.get(reverse("pipeline-inspection-list"), {"search": "KP 12.400"}).data["count"], 1)
        self.assertEqual(self.client.get(reverse("pipeline-cp-survey-point-list"), {"search": "C. Eze"}).data["count"], 1)
        self.assertEqual(self.client.get(reverse("pipeline-row-observation-list"), {"status": "open"}).data["count"], 1)

    def test_evidence_records_cannot_reference_another_tenant_asset(self):
        asset = self.create_asset(self.bravo, "BRAVO-EVIDENCE")
        payload = {
            "asset_id": str(asset.public_id), "inspection_type": "visual", "subject_reference": "KP 1",
            "inspected_at": "2026-10-20T10:00:00Z", "inspector_name": "A. Bello",
        }
        self.assertEqual(self.client.post(reverse("pipeline-inspection-list"), payload, format="json").status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.post(reverse("pipeline-cp-survey-point-list"), {
            "asset_id": str(asset.public_id), "kp": "1", "potential_mv": "-800", "surveyed_at": "2026-10-20T10:00:00Z", "surveyor_name": "A. Bello",
        }, format="json").status_code, status.HTTP_404_NOT_FOUND)
