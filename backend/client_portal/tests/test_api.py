from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from client_portal.models import (
    ClientPortalAccessLog,
    ClientPortalProfile,
    SharedDeliverablePackage,
)
from organizations.models import Membership, Organization

User = get_user_model()


class ClientPortalAPITests(APITestCase):
    def setUp(self):
        self.alpha_admin = User.objects.create_user(
            username="portal-admin@alpha.local",
            email="portal-admin@alpha.local",
            password="password",
        )
        self.alpha_client_user = User.objects.create_user(
            username="shell-rep@client.local",
            email="shell-rep@client.local",
            password="password",
        )
        self.alpha_other_client_user = User.objects.create_user(
            username="total-rep@client.local",
            email="total-rep@client.local",
            password="password",
        )
        self.bravo_user = User.objects.create_user(
            username="portal-bravo@bravo.local",
            email="portal-bravo@bravo.local",
            password="password",
        )

        self.alpha = Organization.objects.create(name="Alpha Marine Energy", slug="alpha-marine")
        self.bravo = Organization.objects.create(name="Bravo Deepwater", slug="bravo-deepwater")

        Membership.objects.create(user=self.alpha_admin, organization=self.alpha, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.alpha_client_user, organization=self.alpha, role=Membership.Role.VIEWER)
        Membership.objects.create(user=self.alpha_other_client_user, organization=self.alpha, role=Membership.Role.VIEWER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo, role=Membership.Role.OWNER)

        # Create client profiles
        self.shell_profile = ClientPortalProfile.objects.create(
            organization=self.alpha,
            user=self.alpha_client_user,
            client_name="Shell Petroleum",
            client_customer_code="SPDC-01",
            allowed_modules=["bunkering", "pipe_integrity", "billing"],
            is_active=True,
        )
        self.total_profile = ClientPortalProfile.objects.create(
            organization=self.alpha,
            user=self.alpha_other_client_user,
            client_name="TotalEnergies EP",
            client_customer_code="TTEP-02",
            allowed_modules=["haulage", "compliance"],
            is_active=True,
        )

        # Alpha Packages
        self.alpha_shell_pkg = SharedDeliverablePackage.objects.create(
            organization=self.alpha,
            client_name="Shell Petroleum",
            title="Offshore Bunker BDN - MT Valiant",
            deliverable_type=SharedDeliverablePackage.DeliverableType.BUNKER_BDN,
            source_reference="BDN-2026-VAL-001",
            summary_metadata={"fuel_grade": "VLSFO", "quantity_mt": 1250, "vessel": "MT Valiant"},
            created_by=self.alpha_admin,
        )
        self.alpha_total_pkg = SharedDeliverablePackage.objects.create(
            organization=self.alpha,
            client_name="TotalEnergies EP",
            title="Pipeline Hydrotest Zero-Drop Dossier",
            deliverable_type=SharedDeliverablePackage.DeliverableType.HYDROTEST_DOSSIER,
            source_reference="HYD-2026-TOT-089",
            summary_metadata={"segment": "KP 14 to KP 28", "test_pressure_bar": 155, "hold_hours": 24},
            created_by=self.alpha_admin,
        )

        # Bravo Package
        self.bravo_pkg = SharedDeliverablePackage.objects.create(
            organization=self.bravo,
            client_name="Chevron Nigeria",
            title="Escravos Marine Stores Inspection",
            deliverable_type=SharedDeliverablePackage.DeliverableType.INSPECTION_REPORT,
            source_reference="INS-BRAVO-99",
            summary_metadata={"inspector": "API 570 Certified"},
            created_by=self.bravo_user,
        )

    def test_client_portal_summary_for_staff(self):
        self.client.force_login(self.alpha_admin)
        url = reverse("client_portal:portal-summary")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_client_user"])
        self.assertEqual(response.data["total_deliverables"], 2)
        self.assertEqual(response.data["active_client_profiles"], 2)

    def test_client_portal_summary_for_client_user(self):
        self.client.force_login(self.alpha_client_user)
        url = reverse("client_portal:portal-summary")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_client_user"])
        self.assertEqual(response.data["client_name"], "Shell Petroleum")
        self.assertEqual(response.data["total_deliverables"], 1)

    def test_client_feed_strictly_scoped_to_client_profile(self):
        self.client.force_login(self.alpha_client_user)
        url = reverse("client_portal:portal-feed")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["client_name"], "Shell Petroleum")
        self.assertEqual(response.data["results"][0]["source_reference"], "BDN-2026-VAL-001")

    def test_package_detail_and_access_logging(self):
        self.client.force_login(self.alpha_client_user)
        url = reverse("client_portal:package-detail", kwargs={"public_id": self.alpha_shell_pkg.public_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Offshore Bunker BDN - MT Valiant")

        # Verify access log was recorded
        log_entry = ClientPortalAccessLog.objects.filter(
            organization=self.alpha,
            resource_reference="BDN-2026-VAL-001",
            action="VIEW_DELIVERABLE",
        ).first()
        self.assertIsNotNone(log_entry)
        self.assertEqual(log_entry.client_name, "Shell Petroleum")

    def test_client_cannot_access_other_client_package(self):
        self.client.force_login(self.alpha_client_user)
        url = reverse("client_portal:package-detail", kwargs={"public_id": self.alpha_total_pkg.public_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cross_tenant_package_not_found(self):
        self.client.force_login(self.alpha_client_user)
        url = reverse("client_portal:package-detail", kwargs={"public_id": self.bravo_pkg.public_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_verification_seal_endpoint(self):
        self.client.force_login(self.alpha_client_user)
        url = reverse("client_portal:package-verify", kwargs={"public_id": self.alpha_shell_pkg.public_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_valid"])
        self.assertEqual(response.data["verification_seal"], self.alpha_shell_pkg.verification_seal)

    def test_publish_deliverable_package(self):
        self.client.force_login(self.alpha_admin)
        url = reverse("client_portal:package-list-create")
        payload = {
            "client_name": "Shell Petroleum",
            "title": "Commercial Invoice - October Bunkering",
            "deliverable_type": "commercial_invoice",
            "source_reference": "INV-2026-SHL-01",
            "summary_metadata": {"invoice_total_minor": 4500000000, "currency": "NGN"},
        }
        response = self.client.post(url, data=payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(len(response.data["verification_seal"]) > 20)

    def test_create_client_profile_permission_check(self):
        new_user = User.objects.create_user(username="newclient@external.local", email="newclient@external.local")
        Membership.objects.create(user=new_user, organization=self.alpha, role=Membership.Role.VIEWER)

        # Viewer cannot create profile
        self.client.force_login(self.alpha_client_user)
        url = reverse("client_portal:profile-list-create")
        response = self.client.post(url, data={"target_user_id": new_user.id, "client_name": "Agip Eni"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Admin can create profile
        self.client.force_login(self.alpha_admin)
        response = self.client.post(url, data={"target_user_id": new_user.id, "client_name": "Agip Eni"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["client_name"], "Agip Eni")
