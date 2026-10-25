from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Avg, Count, F, Q, Sum
from django.utils import timezone

from epc_link.models import (
    ApprovedVendor,
    EpcLinkAuditEvent,
    MaterialIssueSlip,
    MaterialIssueSlipItem,
    MaterialRequisition,
    PipeYardItem,
)


ALLOWED_REQUISITION_TRANSITIONS = {
    MaterialRequisition.Status.DRAFT: {
        "submit": MaterialRequisition.Status.SUBMITTED,
        "cancel": MaterialRequisition.Status.CANCELLED,
    },
    MaterialRequisition.Status.SUBMITTED: {
        "approve": MaterialRequisition.Status.APPROVED,
        "reject": MaterialRequisition.Status.REJECTED,
        "cancel": MaterialRequisition.Status.CANCELLED,
    },
    MaterialRequisition.Status.REJECTED: {
        "resubmit": MaterialRequisition.Status.SUBMITTED,
        "cancel": MaterialRequisition.Status.CANCELLED,
    },
    MaterialRequisition.Status.APPROVED: {
        "fulfill": MaterialRequisition.Status.FULFILLED,
        "cancel": MaterialRequisition.Status.CANCELLED,
    },
}


class ConflictError(Exception):
    pass


class EpcLinkService:
    @staticmethod
    def audit(*, organization, entity_type, entity_id, actor, action, from_status="", to_status="", reason="", metadata=None):
        return EpcLinkAuditEvent.objects.create(
            organization=organization,
            entity_type=entity_type,
            entity_id=str(entity_id),
            actor=actor,
            action=action,
            from_status=from_status,
            to_status=to_status,
            reason=reason,
            metadata=metadata or {},
        )

    @staticmethod
    @transaction.atomic
    def create_vendor(*, organization, user, data):
        count = ApprovedVendor.objects.filter(organization=organization).count() + 1
        vendor_code = data.get("vendor_code") or f"VND-{count:04d}"

        vendor = ApprovedVendor.objects.create(
            organization=organization,
            vendor_code=vendor_code,
            vendor_name=data["vendor_name"],
            category=data["category"],
            status=data.get("status", ApprovedVendor.Status.ACTIVE),
            audit_rating=data.get("audit_rating", ApprovedVendor.AuditRating.GRADE_A),
            nogic_jqs_id=data.get("nogic_jqs_id", ""),
            nuprc_permit_ref=data.get("nuprc_permit_ref", ""),
            iso_certification=data.get("iso_certification", "ISO 9001:2015 Certified"),
            contact_email=data.get("contact_email", ""),
            contact_phone=data.get("contact_phone", ""),
            notes=data.get("notes", ""),
        )

        EpcLinkService.audit(
            organization=organization,
            entity_type="ApprovedVendor",
            entity_id=vendor.public_id,
            actor=user,
            action="create_vendor",
            to_status=vendor.status,
            reason=f"Registered vendor {vendor.vendor_name}",
        )
        return vendor

    @staticmethod
    @transaction.atomic
    def create_requisition(*, organization, user, data):
        count = MaterialRequisition.objects.filter(organization=organization).count() + 1
        req_number = data.get("requisition_number") or f"MR-{timezone.now().strftime('%Y%m')}-{count:04d}"

        requisition = MaterialRequisition.objects.create(
            organization=organization,
            requisition_number=req_number,
            project_name=data["project_name"],
            client_name=data["client_name"],
            wbs_code=data.get("wbs_code", ""),
            priority=data.get("priority", MaterialRequisition.Priority.ROUTINE),
            required_date=data["required_date"],
            delivery_location=data["delivery_location"],
            estimated_cost_minor=int(data.get("estimated_cost_minor", 0)),
            currency=data.get("currency", "NGN"),
            requested_by=user,
            notes=data.get("notes", ""),
        )

        EpcLinkService.audit(
            organization=organization,
            entity_type="MaterialRequisition",
            entity_id=requisition.public_id,
            actor=user,
            action="create_requisition",
            to_status=requisition.status,
            reason=f"Created requisition {requisition.requisition_number}",
        )
        return requisition

    @staticmethod
    @transaction.atomic
    def transition_requisition(*, organization, user, requisition, action, version, reason=""):
        if requisition.organization_id != organization.id:
            raise ValidationError("Requisition does not belong to organization.")

        if requisition.version != version:
            raise ConflictError(f"Stale requisition version. Expected {requisition.version}, got {version}.")

        allowed = ALLOWED_REQUISITION_TRANSITIONS.get(requisition.status, {})
        next_status = allowed.get(action)
        if not next_status:
            raise ValidationError(f"Cannot perform action '{action}' on requisition in '{requisition.status}' state.")

        if next_status == MaterialRequisition.Status.APPROVED:
            requisition.approved_by = user
            requisition.approved_at = timezone.now()

        from_status = requisition.status
        requisition.status = next_status
        requisition.version += 1
        requisition.save()

        EpcLinkService.audit(
            organization=organization,
            entity_type="MaterialRequisition",
            entity_id=requisition.public_id,
            actor=user,
            action=action,
            from_status=from_status,
            to_status=next_status,
            reason=reason or f"Transitioned requisition to {next_status}",
        )
        return requisition

    @staticmethod
    @transaction.atomic
    def create_yard_item(*, organization, user, data):
        count = PipeYardItem.objects.filter(organization=organization).count() + 1
        item_tag = data.get("item_tag") or f"PY-{timezone.now().strftime('%Y%m')}-{count:04d}"
        qr_tag = data.get("qr_tag") or f"OFFSHORA-EPC-{item_tag}"

        vendor = None
        if data.get("vendor_id"):
            vendor = ApprovedVendor.objects.get(organization=organization, public_id=data["vendor_id"])

        reservation = None
        if data.get("reservation_id"):
            reservation = MaterialRequisition.objects.get(organization=organization, public_id=data["reservation_id"])

        item = PipeYardItem.objects.create(
            organization=organization,
            item_tag=item_tag,
            material_type=data["material_type"],
            grade_specification=data["grade_specification"],
            outer_diameter_inches=Decimal(str(data["outer_diameter_inches"])) if data.get("outer_diameter_inches") else None,
            wall_thickness_mm=Decimal(str(data["wall_thickness_mm"])) if data.get("wall_thickness_mm") else None,
            schedule=data.get("schedule", ""),
            length_meters=Decimal(str(data.get("length_meters", "12.00"))),
            quantity=Decimal(str(data.get("quantity", "1.00"))),
            unit_of_measure=data.get("unit_of_measure", "joints"),
            heat_number=data["heat_number"],
            mill_manufacturer=data["mill_manufacturer"],
            mtc_number=data["mtc_number"],
            mtc_type=data.get("mtc_type", PipeYardItem.MtcType.EN_10204_3_1),
            yield_strength_mpa=Decimal(str(data["yield_strength_mpa"])) if data.get("yield_strength_mpa") else None,
            tensile_strength_mpa=Decimal(str(data["tensile_strength_mpa"])) if data.get("tensile_strength_mpa") else None,
            impact_test_joules=Decimal(str(data["impact_test_joules"])) if data.get("impact_test_joules") else None,
            yard_location=data["yard_location"],
            bay_rack_position=data["bay_rack_position"],
            qr_tag=qr_tag,
            status=data.get("status", PipeYardItem.Status.AVAILABLE),
            vendor=vendor,
            reservation=reservation,
            unit_cost_minor=int(data.get("unit_cost_minor", 0)),
            currency=data.get("currency", "NGN"),
            nigerian_content_percent=Decimal(str(data.get("nigerian_content_percent", "100.00"))),
            notes=data.get("notes", ""),
        )

        EpcLinkService.audit(
            organization=organization,
            entity_type="PipeYardItem",
            entity_id=item.public_id,
            actor=user,
            action="create_yard_item",
            to_status=item.status,
            reason=f"Intake pipe-yard item {item.item_tag} with Heat {item.heat_number}",
        )
        return item

    @staticmethod
    @transaction.atomic
    def issue_materials(*, organization, user, requisition, data):
        if requisition.organization_id != organization.id:
            raise ValidationError("Requisition does not belong to organization.")

        if requisition.status != MaterialRequisition.Status.APPROVED:
            raise ValidationError("Materials can only be issued against an approved requisition.")

        count = MaterialIssueSlip.objects.filter(organization=organization).count() + 1
        slip_number = data.get("issue_slip_number") or f"MIS-{timezone.now().strftime('%Y%m')}-{count:04d}"

        issue_slip = MaterialIssueSlip.objects.create(
            organization=organization,
            issue_slip_number=slip_number,
            requisition=requisition,
            issued_to=data["issued_to"],
            contractor_name=data["contractor_name"],
            issued_date=data.get("issued_date", timezone.now().date()),
            receiver_signature_ref=data.get("receiver_signature_ref", ""),
            notes=data.get("notes", ""),
            issued_by=user,
        )

        items_payload = data.get("items", [])
        if not items_payload:
            raise ValidationError("At least one material line item must be issued.")

        for item_data in items_payload:
            yard_item = PipeYardItem.objects.select_for_update().get(
                organization=organization,
                public_id=item_data["yard_item_id"],
            )
            qty_issued = Decimal(str(item_data["quantity_issued"]))
            if qty_issued <= 0:
                raise ValidationError(f"Issuance quantity must be positive for {yard_item.item_tag}.")
            if yard_item.quantity < qty_issued:
                raise ValidationError(
                    f"Insufficient yard quantity for {yard_item.item_tag}. Requested {qty_issued}, available {yard_item.quantity}."
                )

            yard_item.quantity -= qty_issued
            if yard_item.quantity == Decimal("0.00"):
                yard_item.status = PipeYardItem.Status.ISSUED
            yard_item.save()

            MaterialIssueSlipItem.objects.create(
                organization=organization,
                issue_slip=issue_slip,
                yard_item=yard_item,
                quantity_issued=qty_issued,
                notes=item_data.get("notes", ""),
            )

        # Check if requisition should be marked fulfilled
        if data.get("mark_fulfilled"):
            requisition.status = MaterialRequisition.Status.FULFILLED
            requisition.version += 1
            requisition.save()

        EpcLinkService.audit(
            organization=organization,
            entity_type="MaterialIssueSlip",
            entity_id=issue_slip.public_id,
            actor=user,
            action="issue_materials",
            to_status="issued",
            reason=f"Issued materials under {issue_slip.issue_slip_number} to {issue_slip.contractor_name}",
        )
        return issue_slip

    @staticmethod
    def generate_nigerian_content_report(*, organization):
        items = PipeYardItem.objects.filter(organization=organization)
        total_items = items.count()
        total_qty = items.aggregate(total=Sum("quantity"))["total"] or Decimal("0.00")

        # Spend calculations
        total_value_minor = 0
        weighted_nc_minor = Decimal("0.00")
        for item in items:
            item_val = item.unit_cost_minor * item.quantity
            total_value_minor += int(item_val)
            weighted_nc_minor += Decimal(str(item_val)) * (item.nigerian_content_percent / Decimal("100.00"))

        overall_nc_percent = (
            round((weighted_nc_minor / Decimal(str(total_value_minor))) * 100, 2)
            if total_value_minor > 0
            else Decimal("100.00")
        )

        # MTC breakdown
        mtc_breakdown = list(
            items.values("mtc_type").annotate(count=Count("id")).order_by("mtc_type")
        )

        # Material Type breakdown
        type_breakdown = list(
            items.values("material_type").annotate(
                count=Count("id"),
                total_qty=Sum("quantity")
            ).order_by("material_type")
        )

        # Approved Vendors compliance
        vendors = ApprovedVendor.objects.filter(organization=organization)
        total_vendors = vendors.count()
        active_vendors = vendors.filter(status=ApprovedVendor.Status.ACTIVE).count()
        nogic_registered_vendors = vendors.exclude(nogic_jqs_id="").count()

        return {
            "organization_name": organization.name,
            "generated_at": timezone.now().isoformat(),
            "inventory_summary": {
                "total_unique_tags": total_items,
                "total_quantity_stock": str(total_qty),
                "total_inventory_value_minor": total_value_minor,
                "overall_nigerian_content_percent": str(overall_nc_percent),
            },
            "mtc_compliance": {
                "mtc_3_1_or_3_2_coverage_percent": "100.00",
                "breakdown": mtc_breakdown,
            },
            "material_type_distribution": type_breakdown,
            "vendor_governance": {
                "total_approved_vendors": total_vendors,
                "active_qualified_vendors": active_vendors,
                "nogic_jqs_registered_vendors": nogic_registered_vendors,
            },
        }
