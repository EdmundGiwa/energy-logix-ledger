from decimal import Decimal
from django.contrib.auth import get_user_model
from django.db import DatabaseError, connection
from django.test import TransactionTestCase

from epc_link.models import (
    ApprovedVendor,
    EpcLinkAuditEvent,
    MaterialIssueSlip,
    MaterialRequisition,
    PipeYardItem,
)
from organizations.models import Membership, Organization

User = get_user_model()


class EpcLinkDatabaseSecurityTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.alpha_user = User.objects.create_user(username="epc-rls-alpha@test.local", email="epc-rls-alpha@test.local", password="password")
        self.bravo_user = User.objects.create_user(username="epc-rls-bravo@test.local", email="epc-rls-bravo@test.local", password="password")
        self.alpha_org = Organization.objects.create(name="EPC RLS Alpha", slug="epc-rls-alpha")
        self.bravo_org = Organization.objects.create(name="EPC RLS Bravo", slug="epc-rls-bravo")
        Membership.objects.create(user=self.alpha_user, organization=self.alpha_org, role=Membership.Role.OWNER)
        Membership.objects.create(user=self.bravo_user, organization=self.bravo_org, role=Membership.Role.OWNER)

        self.alpha_vendor = ApprovedVendor.objects.create(
            organization=self.alpha_org,
            vendor_code="VND-RLS-01",
            vendor_name="Alpha Mill",
            category=ApprovedVendor.Category.TUBULARS,
        )
        self.bravo_vendor = ApprovedVendor.objects.create(
            organization=self.bravo_org,
            vendor_code="VND-RLS-02",
            vendor_name="Bravo Mill",
            category=ApprovedVendor.Category.TUBULARS,
        )

        self.alpha_req = MaterialRequisition.objects.create(
            organization=self.alpha_org,
            requisition_number="MR-RLS-01",
            project_name="Alpha Project",
            client_name="Alpha Client",
            required_date="2026-12-01",
            delivery_location="Alpha Yard",
            requested_by=self.alpha_user,
        )

        self.alpha_audit = EpcLinkAuditEvent.objects.create(
            organization=self.alpha_org,
            entity_type="ApprovedVendor",
            entity_id=str(self.alpha_vendor.public_id),
            actor=self.alpha_user,
            action="create_vendor",
            to_status="active",
            reason="Initial registration",
        )

    def test_runtime_database_role_hides_and_rejects_cross_tenant_rows(self):
        with connection.cursor() as cursor:
            cursor.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO petroledger_app")
            cursor.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO petroledger_app")
            cursor.execute("SET ROLE petroledger_app")
            try:
                cursor.execute("SELECT set_config('app.current_user_id', %s, false)", (str(self.alpha_user.pk),))
                cursor.execute("SELECT vendor_code FROM epc_link_approvedvendor ORDER BY vendor_code")
                self.assertEqual([row[0] for row in cursor.fetchall()], ["VND-RLS-01"])

                # Cross-tenant insert must fail RLS
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        """
                        INSERT INTO epc_link_approvedvendor (
                            public_id, organization_id, vendor_code, vendor_name,
                            category, status, audit_rating, nogic_jqs_id,
                            nuprc_permit_ref, iso_certification, contact_email,
                            contact_phone, notes, created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), %s, 'FORGED-VND', 'Hacker Supplies',
                            'tubulars', 'active', 'A', '', '', '', '', '', '', now(), now()
                        )
                        """,
                        (self.bravo_org.pk,),
                    )

                # Cross-tenant vendor reference in pipe-yard item must fail trigger
                with self.assertRaises(DatabaseError):
                    cursor.execute(
                        """
                        INSERT INTO epc_link_pipeyarditem (
                            public_id, organization_id, item_tag, material_type,
                            grade_specification, length_meters, quantity,
                            unit_of_measure, heat_number, mill_manufacturer,
                            mtc_number, mtc_type, yard_location, bay_rack_position,
                            qr_tag, status, vendor_id, unit_cost_minor,
                            currency, nigerian_content_percent, notes,
                            created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), %s, 'PY-FORGED-01', 'line_pipe',
                            'API 5L X65', 12.00, 10.00,
                            'joints', 'HT-001', 'Mill X',
                            'MTC-001', 'en_10204_3_1', 'Yard A', 'Bay 1',
                            '', 'available', %s, 0,
                            'NGN', 100.00, '',
                            now(), now()
                        )
                        """,
                        (self.alpha_org.pk, self.bravo_vendor.pk),
                    )
            finally:
                cursor.execute("ROLLBACK")
                cursor.execute("RESET ROLE")

    def test_audit_events_are_database_immutable(self):
        with connection.cursor() as cursor:
            with self.assertRaises(DatabaseError):
                cursor.execute(
                    "UPDATE epc_link_epclinkauditevent SET reason = 'tampered' WHERE id = %s",
                    (self.alpha_audit.pk,),
                )
            with self.assertRaises(DatabaseError):
                cursor.execute(
                    "DELETE FROM epc_link_epclinkauditevent WHERE id = %s",
                    (self.alpha_audit.pk,),
                )
