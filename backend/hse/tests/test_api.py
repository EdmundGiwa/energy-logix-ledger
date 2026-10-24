from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from hse.models import Credential, SafetyProcedure, Worker
from organizations.models import Membership, Organization


class SafePassAPITests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.owner = User.objects.create_user(username="hse-alpha@test.local", email="hse-alpha@test.local", password="password")
        self.other = User.objects.create_user(username="hse-bravo@test.local", email="hse-bravo@test.local", password="password")
        self.alpha = Organization.objects.create(name="Alpha Energy", slug="hse-alpha")
        self.bravo = Organization.objects.create(name="Bravo Energy", slug="hse-bravo")
        Membership.objects.create(user=self.owner, organization=self.alpha, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.other, organization=self.bravo, role=Membership.Role.OWNER)
        self.client.force_login(self.owner)

    def create_worker(self):
        response = self.client.post(reverse("hse-worker-list"), {"employee_number": "EMP-001", "full_name": "Test Worker", "job_title": "Technician", "email": "worker@test.local"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return response.data

    def create_procedure(self):
        response = self.client.post(reverse("hse-procedure-list"), {
            "name": "Approved pilot procedure", "site": "Test site", "credential_buffer_days": 30,
            "oxygen_min_percent": "19.50", "oxygen_max_percent": "23.50", "max_lel_percent": "10.00",
            "max_h2s_ppm": "5.00", "required_credential_kinds": ["bosiet", "medical"],
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        approved = self.client.post(reverse("hse-procedure-approve", args=(response.data["id"],)), {}, format="json")
        self.assertEqual(approved.status_code, status.HTTP_200_OK, approved.data)
        return approved.data

    def test_mobilization_fails_closed_until_required_credentials_are_verified(self):
        worker, procedure = self.create_worker(), self.create_procedure()
        public_evidence = self.client.post(reverse("hse-credential-list"), {
            "worker_id": worker["id"],
            "kind": "bosiet",
            "certificate_number": "PUBLIC-EVIDENCE-001",
            "issuer": "Test provider",
            "valid_from": timezone.localdate().isoformat(),
            "expires_on": (timezone.localdate() + timedelta(days=365)).isoformat(),
            "evidence_reference": "https://public.example.test/certificate.pdf",
        }, format="json")
        self.assertEqual(public_evidence.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("evidence_reference", public_evidence.data)
        mob = self.client.post(reverse("hse-mobilization-list"), {"destination": "Escravos", "scheduled_at": (timezone.now() + timedelta(days=45)).isoformat(), "procedure_id": procedure["id"]}, format="json")
        self.assertEqual(mob.status_code, status.HTTP_201_CREATED, mob.data)
        added = self.client.post(reverse("hse-mobilization-crew", args=(mob.data["id"],)), {"worker_id": worker["id"]}, format="json")
        checked = self.client.post(reverse("hse-mobilization-assess", args=(mob.data["id"],)), {"version": added.data["version"]}, format="json")
        self.assertEqual(checked.status_code, status.HTTP_200_OK, checked.data)
        self.assertEqual(checked.data["status"], "blocked")
        self.assertEqual(len(checked.data["crew_entries"][0]["blocking_reasons"]), 2)
        for kind in ("bosiet", "medical"):
            created = self.client.post(reverse("hse-credential-list"), {
                "worker_id": worker["id"], "kind": kind, "certificate_number": f"{kind.upper()}-001",
                "issuer": "Approved test provider", "valid_from": timezone.localdate().isoformat(),
                "expires_on": (timezone.localdate() + timedelta(days=365)).isoformat(),
            }, format="json")
            self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
            self.assertEqual(self.client.post(reverse("hse-credential-verify", args=(created.data["id"],)), {}, format="json").status_code, status.HTTP_200_OK)
        ready = self.client.post(reverse("hse-mobilization-assess", args=(mob.data["id"],)), {"version": checked.data["version"]}, format="json")
        self.assertEqual(ready.data["status"], "ready")
        released = self.client.post(reverse("hse-mobilization-release", args=(mob.data["id"],)), {"version": ready.data["version"], "reason": "All credentials verified"}, format="json")
        self.assertEqual(released.status_code, status.HTTP_200_OK, released.data)
        self.assertEqual(released.data["status"], "released")

    def test_permit_interlock_and_two_tenant_access(self):
        worker, procedure = self.create_worker(), self.create_procedure()
        permit = self.client.post(reverse("hse-permit-list"), {
            "kind": "confined_space", "title": "Tank entry", "site": "TK-01", "work_description": "Internal inspection",
            "procedure_id": procedure["id"], "performing_authority_id": worker["id"],
            "starts_at": timezone.now().isoformat(), "expires_at": (timezone.now() + timedelta(hours=8)).isoformat(),
            "hazards": ["restricted access"], "controls": ["forced ventilation"],
        }, format="json")
        self.assertEqual(permit.status_code, status.HTTP_201_CREATED, permit.data)
        submitted = self.client.post(reverse("hse-permit-transition", args=(permit.data["id"], "submit")), {"version": 1, "reason": "Ready for review"}, format="json")
        self.assertEqual(submitted.status_code, status.HTTP_200_OK, submitted.data)
        blocked = self.client.post(reverse("hse-permit-transition", args=(permit.data["id"], "approve")), {"version": 2, "reason": "Approve"}, format="json")
        self.assertEqual(blocked.status_code, status.HTTP_409_CONFLICT)
        gas = self.client.post(reverse("hse-permit-gas-test", args=(permit.data["id"],)), {
            "tested_at": timezone.now().isoformat(), "oxygen_percent": "20.90", "lel_percent": "0.00", "h2s_ppm": "0.00",
            "instrument_reference": "GAS-001", "instrument_calibration_expires_on": (timezone.localdate() + timedelta(days=90)).isoformat(),
        }, format="json")
        self.assertEqual(gas.status_code, status.HTTP_201_CREATED, gas.data)
        self.assertTrue(gas.data["passed"])
        for kind in ("jsa", "toolbox"):
            ack = self.client.post(reverse("hse-permit-ack", args=(permit.data["id"],)), {"worker_id": worker["id"], "kind": kind, "acknowledged_at": timezone.now().isoformat(), "statement": "Hazards and controls understood."}, format="json")
            self.assertEqual(ack.status_code, status.HTTP_201_CREATED, ack.data)
        approved = self.client.post(reverse("hse-permit-transition", args=(permit.data["id"], "approve")), {"version": 2, "reason": "Controls verified"}, format="json")
        self.assertEqual(approved.status_code, status.HTTP_200_OK, approved.data)
        exported = self.client.get(reverse("hse-permit-export", args=(permit.data["id"],)))
        self.assertTrue(exported.content.startswith(b"%PDF-1.4"))

        self.client.force_login(self.other)
        self.assertEqual(self.client.get(reverse("hse-permit-detail", args=(permit.data["id"],))).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.post(reverse("hse-permit-transition", args=(permit.data["id"], "suspend")), {"version": 3, "reason": "forged"}, format="json").status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(reverse("hse-permit-export", args=(permit.data["id"],))).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(reverse("hse-permit-list")).data, [])

    def test_two_tenant_indirect_references_and_search_fail_closed(self):
        alpha_worker = self.create_worker()
        alpha_procedure = self.create_procedure()

        bravo_worker = Worker.objects.create(
            organization=self.bravo,
            employee_number="BRAVO-SECRET",
            full_name="Bravo Hidden Worker",
            job_title="Technician",
        )
        bravo_procedure = SafetyProcedure.objects.create(
            organization=self.bravo,
            name="Bravo Restricted Procedure",
            site="Bravo site",
            credential_buffer_days=30,
            oxygen_min_percent="19.50",
            oxygen_max_percent="23.50",
            max_lel_percent="10.00",
            max_h2s_ppm="5.00",
            required_credential_kinds=["bosiet"],
            is_approved=True,
            approved_by=self.other,
            approved_at=timezone.now(),
        )
        bravo_credential = Credential.objects.create(
            organization=self.bravo,
            worker=bravo_worker,
            kind=Credential.Kind.BOSIET,
            certificate_number="BRAVO-SECRET-CERT",
            issuer="Bravo provider",
            valid_from=timezone.localdate(),
            expires_on=timezone.localdate() + timedelta(days=365),
        )

        search = self.client.get(reverse("hse-worker-list"), {"search": "Bravo Hidden"})
        self.assertEqual(search.status_code, status.HTTP_200_OK)
        self.assertEqual(search.data, [])
        self.assertNotIn(str(bravo_procedure.public_id), {record["id"] for record in self.client.get(reverse("hse-procedure-list")).data})
        self.assertNotIn(str(bravo_credential.public_id), {record["id"] for record in self.client.get(reverse("hse-credential-list")).data})
        self.assertEqual(
            self.client.post(reverse("hse-credential-verify", args=(bravo_credential.public_id,)), {}, format="json").status_code,
            status.HTTP_404_NOT_FOUND,
        )

        credential = self.client.post(reverse("hse-credential-list"), {
            "worker_id": str(bravo_worker.public_id),
            "kind": "bosiet",
            "certificate_number": "FORGED-BRAVO-CERT",
            "issuer": "Untrusted cross-tenant request",
            "valid_from": timezone.localdate().isoformat(),
            "expires_on": (timezone.localdate() + timedelta(days=365)).isoformat(),
        }, format="json")
        self.assertEqual(credential.status_code, status.HTTP_404_NOT_FOUND)

        mobilization = self.client.post(reverse("hse-mobilization-list"), {
            "destination": "Cross-tenant destination",
            "scheduled_at": (timezone.now() + timedelta(days=45)).isoformat(),
            "procedure_id": str(bravo_procedure.public_id),
        }, format="json")
        self.assertEqual(mobilization.status_code, status.HTTP_404_NOT_FOUND)

        own_mobilization = self.client.post(reverse("hse-mobilization-list"), {
            "destination": "Alpha destination",
            "scheduled_at": (timezone.now() + timedelta(days=45)).isoformat(),
            "procedure_id": alpha_procedure["id"],
        }, format="json")
        self.assertEqual(own_mobilization.status_code, status.HTTP_201_CREATED, own_mobilization.data)
        crew = self.client.post(reverse("hse-mobilization-crew", args=(own_mobilization.data["id"],)), {
            "worker_id": str(bravo_worker.public_id),
        }, format="json")
        self.assertEqual(crew.status_code, status.HTTP_404_NOT_FOUND)

        cross_procedure_permit = self.client.post(reverse("hse-permit-list"), {
            "kind": "confined_space",
            "title": "Cross-procedure attempt",
            "site": "TK-02",
            "work_description": "Must not be created",
            "procedure_id": str(bravo_procedure.public_id),
            "performing_authority_id": alpha_worker["id"],
            "starts_at": timezone.now().isoformat(),
            "expires_at": (timezone.now() + timedelta(hours=8)).isoformat(),
            "hazards": ["cross tenant"],
            "controls": ["server isolation"],
        }, format="json")
        self.assertEqual(cross_procedure_permit.status_code, status.HTTP_404_NOT_FOUND)

        cross_worker_permit = self.client.post(reverse("hse-permit-list"), {
            "kind": "confined_space",
            "title": "Cross-worker attempt",
            "site": "TK-03",
            "work_description": "Must not be created",
            "procedure_id": alpha_procedure["id"],
            "performing_authority_id": str(bravo_worker.public_id),
            "starts_at": timezone.now().isoformat(),
            "expires_at": (timezone.now() + timedelta(hours=8)).isoformat(),
            "hazards": ["cross tenant"],
            "controls": ["server isolation"],
        }, format="json")
        self.assertEqual(cross_worker_permit.status_code, status.HTTP_404_NOT_FOUND)

        own_permit = self.client.post(reverse("hse-permit-list"), {
            "kind": "confined_space",
            "title": "Alpha permit",
            "site": "TK-04",
            "work_description": "Tenant-safe acknowledgement test",
            "procedure_id": alpha_procedure["id"],
            "performing_authority_id": alpha_worker["id"],
            "starts_at": timezone.now().isoformat(),
            "expires_at": (timezone.now() + timedelta(hours=8)).isoformat(),
            "hazards": ["restricted access"],
            "controls": ["server isolation"],
        }, format="json")
        self.assertEqual(own_permit.status_code, status.HTTP_201_CREATED, own_permit.data)
        acknowledgement = self.client.post(reverse("hse-permit-ack", args=(own_permit.data["id"],)), {
            "worker_id": str(bravo_worker.public_id),
            "kind": "jsa",
            "acknowledged_at": timezone.now().isoformat(),
            "statement": "Forged cross-tenant acknowledgement",
        }, format="json")
        self.assertEqual(acknowledgement.status_code, status.HTTP_404_NOT_FOUND)

    def test_permit_full_lifecycle_is_version_checked_and_audited(self):
        worker, procedure = self.create_worker(), self.create_procedure()
        permit = self.client.post(reverse("hse-permit-list"), {
            "kind": "hot_work",
            "title": "Controlled hot work",
            "site": "Process deck",
            "work_description": "Repair a verified non-live support bracket",
            "procedure_id": procedure["id"],
            "performing_authority_id": worker["id"],
            "starts_at": timezone.now().isoformat(),
            "expires_at": (timezone.now() + timedelta(hours=8)).isoformat(),
            "hazards": ["ignition source"],
            "controls": ["isolation verified"],
        }, format="json")
        self.assertEqual(permit.status_code, status.HTTP_201_CREATED, permit.data)

        submitted = self.client.post(reverse("hse-permit-transition", args=(permit.data["id"], "submit")), {
            "version": 1,
            "reason": "Controls prepared",
        }, format="json")
        self.assertEqual(submitted.status_code, status.HTTP_200_OK, submitted.data)
        self.assertEqual((submitted.data["status"], submitted.data["version"]), ("under_review", 2))

        gas = self.client.post(reverse("hse-permit-gas-test", args=(permit.data["id"],)), {
            "tested_at": timezone.now().isoformat(),
            "oxygen_percent": "20.90",
            "lel_percent": "0.00",
            "h2s_ppm": "0.00",
            "instrument_reference": "GAS-LIFECYCLE-001",
            "instrument_calibration_expires_on": (timezone.localdate() + timedelta(days=90)).isoformat(),
        }, format="json")
        self.assertEqual(gas.status_code, status.HTTP_201_CREATED, gas.data)
        for kind in ("jsa", "toolbox"):
            acknowledgement = self.client.post(reverse("hse-permit-ack", args=(permit.data["id"],)), {
                "worker_id": worker["id"],
                "kind": kind,
                "acknowledged_at": timezone.now().isoformat(),
                "statement": "Hazards, controls, and stop-work responsibility understood.",
            }, format="json")
            self.assertEqual(acknowledgement.status_code, status.HTTP_201_CREATED, acknowledgement.data)

        approved = self.client.post(reverse("hse-permit-transition", args=(permit.data["id"], "approve")), {
            "version": 2,
            "reason": "Safety evidence accepted",
        }, format="json")
        self.assertEqual((approved.status_code, approved.data["status"], approved.data["version"]), (status.HTTP_200_OK, "approved", 3))

        stale = self.client.post(reverse("hse-permit-transition", args=(permit.data["id"], "activate")), {
            "version": 2,
            "reason": "Stale browser attempt",
        }, format="json")
        self.assertEqual(stale.status_code, status.HTTP_409_CONFLICT)

        version = 3
        for action, expected_status in (
            ("activate", "active"),
            ("suspend", "suspended"),
            ("resume", "active"),
            ("close", "closed"),
        ):
            response = self.client.post(reverse("hse-permit-transition", args=(permit.data["id"], action)), {
                "version": version,
                "reason": f"Lifecycle test: {action}",
            }, format="json")
            self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
            version += 1
            self.assertEqual((response.data["status"], response.data["version"]), (expected_status, version))

        detail = self.client.get(reverse("hse-permit-detail", args=(permit.data["id"],)))
        actions = [event["action"] for event in detail.data["audit_events"]]
        for action in ("submit", "approve", "activate", "suspend", "resume", "close"):
            self.assertIn(action, actions)
        self.assertEqual(self.client.get(reverse("hse-permit-export", args=(permit.data["id"],))).status_code, status.HTTP_200_OK)

    def test_rejection_cancellation_and_approval_role_are_fail_closed(self):
        User = get_user_model()
        member = User.objects.create_user(username="hse-member@test.local", email="hse-member@test.local", password="password")
        Membership.objects.create(user=member, organization=self.alpha, role=Membership.Role.MEMBER)
        worker, procedure = self.create_worker(), self.create_procedure()

        def create_permit(title):
            response = self.client.post(reverse("hse-permit-list"), {
                "kind": "excavation",
                "title": title,
                "site": "Test site",
                "work_description": "Controlled lifecycle branch test",
                "procedure_id": procedure["id"],
                "performing_authority_id": worker["id"],
                "starts_at": timezone.now().isoformat(),
                "expires_at": (timezone.now() + timedelta(hours=8)).isoformat(),
                "hazards": ["buried services"],
                "controls": ["service drawing reviewed"],
            }, format="json")
            self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
            return response

        cancelled = create_permit("Cancelled permit")
        cancelled = self.client.post(reverse("hse-permit-transition", args=(cancelled.data["id"], "cancel")), {
            "version": 1,
            "reason": "Work no longer required",
        }, format="json")
        self.assertEqual(cancelled.data["status"], "cancelled")

        rejected = create_permit("Rejected permit")
        submitted = self.client.post(reverse("hse-permit-transition", args=(rejected.data["id"], "submit")), {
            "version": 1,
            "reason": "Review requested",
        }, format="json")
        self.client.force_login(member)
        forbidden = self.client.post(reverse("hse-permit-transition", args=(rejected.data["id"], "approve")), {
            "version": 2,
            "reason": "Member must not approve",
        }, format="json")
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_login(self.owner)
        rejected = self.client.post(reverse("hse-permit-transition", args=(rejected.data["id"], "reject")), {
            "version": submitted.data["version"],
            "reason": "Controls are insufficient",
        }, format="json")
        self.assertEqual((rejected.status_code, rejected.data["status"]), (status.HTTP_200_OK, "rejected"))
        self.assertEqual(self.client.get(reverse("hse-permit-export", args=(rejected.data["id"],))).status_code, status.HTTP_404_NOT_FOUND)
