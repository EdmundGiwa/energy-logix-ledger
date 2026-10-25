from decimal import Decimal
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from organizations.models import Membership, Organization
from owner_dashboard.models import (
    Currency,
    ExecutiveExceptionAlert,
    ExecutiveExportJob,
    ExecutiveKpiSnapshot,
)

User = get_user_model()


class OwnerDashboardAPITests(APITestCase):
    def setUp(self):
        self.alpha_owner = User.objects.create_user(
            username="owner-alpha@alpha.local",
            email="owner-alpha@alpha.local",
            password="password",
        )
        self.alpha_viewer = User.objects.create_user(
            username="viewer-alpha@alpha.local",
            email="viewer-alpha@alpha.local",
            password="password",
        )
        self.bravo_owner = User.objects.create_user(
            username="owner-bravo@bravo.local",
            email="owner-bravo@bravo.local",
            password="password",
        )

        self.alpha = Organization.objects.create(name="Alpha Offshore Energy", slug="alpha-offshore")
        self.bravo = Organization.objects.create(name="Bravo Logistics", slug="bravo-logistics")

        Membership.objects.create(user=self.alpha_owner, organization=self.alpha, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.alpha_viewer, organization=self.alpha, role=Membership.Role.VIEWER)
        Membership.objects.create(user=self.bravo_owner, organization=self.bravo, role=Membership.Role.OWNER)

        # Alpha Exception Alerts
        self.alpha_crit_alert = ExecutiveExceptionAlert.objects.create(
            organization=self.alpha,
            severity=ExecutiveExceptionAlert.Severity.CRITICAL,
            module=ExecutiveExceptionAlert.ModuleSource.REFINERY_LINK,
            title="Refinery Gantry Variance > 0.5%",
            description="Depot BK-07 discharge showed 0.72% loss on truck NG-LAG-4412",
            source_record_type="MeterTicket",
            source_record_id="TKT-2026-0881",
            variance_percent=Decimal("0.720"),
        )
        self.alpha_warn_alert = ExecutiveExceptionAlert.objects.create(
            organization=self.alpha,
            severity=ExecutiveExceptionAlert.Severity.WARNING,
            module=ExecutiveExceptionAlert.ModuleSource.SAFE_PASS,
            title="BOSIET Expiries within 21 days",
            description="3 crew members have credentials expiring soon",
            source_record_type="PersonnelCertification",
            source_record_id="CERT-CREW-901",
        )

        # Bravo Exception Alert
        self.bravo_alert = ExecutiveExceptionAlert.objects.create(
            organization=self.bravo,
            severity=ExecutiveExceptionAlert.Severity.CRITICAL,
            module=ExecutiveExceptionAlert.ModuleSource.HAUL_TRAC,
            title="Truck Route Deviation",
            description="Truck deviated from authorized geofence corridor",
            source_record_type="TripDispatch",
            source_record_id="DISP-BRAVO-441",
            variance_percent=Decimal("1.400"),
        )

    def test_live_kpi_projection_usd(self):
        self.client.force_login(self.alpha_owner)
        url = reverse("owner_dashboard:live-kpis")
        response = self.client.get(url, {"currency": "USD"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["currency"], "USD")
        self.assertIn("gross_billed_minor", response.data)
        self.assertIn("product_delivered_tonnage", response.data)
        self.assertIn("reconciliation_rate_percent", response.data)

    def test_live_kpi_projection_ngn(self):
        self.client.force_login(self.alpha_owner)
        url = reverse("owner_dashboard:live-kpis")
        response = self.client.get(url, {"currency": "NGN"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["currency"], "NGN")

    def test_exception_feed_filtering(self):
        self.client.force_login(self.alpha_owner)
        url = reverse("owner_dashboard:exception-feed")

        # All unacknowledged exceptions for Alpha
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

        # Filter by severity=crit
        res_crit = self.client.get(url, {"severity": "crit"})
        self.assertEqual(res_crit.data["count"], 1)
        self.assertEqual(res_crit.data["results"][0]["title"], "Refinery Gantry Variance > 0.5%")

    def test_cross_tenant_isolation_on_exceptions(self):
        self.client.force_login(self.alpha_owner)
        url = reverse("owner_dashboard:exception-feed")
        response = self.client.get(url)
        titles = [item["title"] for item in response.data["results"]]
        self.assertNotIn("Truck Route Deviation", titles)

    def test_acknowledge_exception_permission(self):
        # Viewer cannot acknowledge
        self.client.force_login(self.alpha_viewer)
        url = reverse("owner_dashboard:exception-acknowledge", kwargs={"public_id": self.alpha_crit_alert.public_id})
        res_viewer = self.client.post(url)
        self.assertEqual(res_viewer.status_code, status.HTTP_403_FORBIDDEN)

        # Owner can acknowledge
        self.client.force_login(self.alpha_owner)
        res_owner = self.client.post(url)
        self.assertEqual(res_owner.status_code, status.HTTP_200_OK)
        self.assertTrue(res_owner.data["is_acknowledged"])
        self.assertEqual(res_owner.data["acknowledged_by_email"], self.alpha_owner.email)

    def test_post_executive_exception(self):
        self.client.force_login(self.alpha_owner)
        url = reverse("owner_dashboard:exception-feed")
        payload = {
            "severity": "crit",
            "module": "safe_pass",
            "title": "Failed Confined Space Gas Test",
            "description": "LEL level detected at 14% inside Tank TK-09",
            "source_record_type": "PermitToWork",
            "source_record_id": "PTW-2026-0412",
        }
        response = self.client.post(url, data=payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Failed Confined Space Gas Test")

    def test_request_export_job(self):
        self.client.force_login(self.alpha_owner)
        url = reverse("owner_dashboard:export-list-create")
        payload = {
            "report_type": "executive_brief",
            "file_format": "pdf",
            "filters": {"period": "2026-Q3", "currency": "USD"},
        }
        response = self.client.post(url, data=payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "completed")
        self.assertTrue(len(response.data["download_checksum"]) > 20)

        # Detail view
        detail_url = reverse("owner_dashboard:export-detail", kwargs={"public_id": response.data["public_id"]})
        detail_res = self.client.get(detail_url)
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_res.data["report_type"], "executive_brief")
