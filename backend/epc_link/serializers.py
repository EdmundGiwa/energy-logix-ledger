from rest_framework import serializers

from epc_link.models import (
    ApprovedVendor,
    EpcLinkAuditEvent,
    MaterialIssueSlip,
    MaterialIssueSlipItem,
    MaterialRequisition,
    PipeYardItem,
)
from epc_link.services import ALLOWED_REQUISITION_TRANSITIONS


class ApprovedVendorSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)

    class Meta:
        model = ApprovedVendor
        fields = (
            "id",
            "vendor_code",
            "vendor_name",
            "category",
            "status",
            "audit_rating",
            "nogic_jqs_id",
            "nuprc_permit_ref",
            "iso_certification",
            "contact_email",
            "contact_phone",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class MaterialRequisitionSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    requested_by_name = serializers.CharField(source="requested_by.get_full_name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)
    allowed_actions = serializers.SerializerMethodField()

    class Meta:
        model = MaterialRequisition
        fields = (
            "id",
            "requisition_number",
            "project_name",
            "client_name",
            "wbs_code",
            "priority",
            "status",
            "required_date",
            "delivery_location",
            "estimated_cost_minor",
            "currency",
            "version",
            "requested_by_name",
            "approved_by_name",
            "approved_at",
            "notes",
            "allowed_actions",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "requisition_number",
            "status",
            "version",
            "requested_by_name",
            "approved_by_name",
            "approved_at",
            "allowed_actions",
            "created_at",
            "updated_at",
        )

    def get_allowed_actions(self, obj):
        return list(ALLOWED_REQUISITION_TRANSITIONS.get(obj.status, {}).keys())


class PipeYardItemSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    vendor_id = serializers.UUIDField(source="vendor.public_id", read_only=True)
    vendor_name = serializers.CharField(source="vendor.vendor_name", read_only=True)
    reservation_id = serializers.UUIDField(source="reservation.public_id", read_only=True)
    reservation_number = serializers.CharField(source="reservation.requisition_number", read_only=True)

    class Meta:
        model = PipeYardItem
        fields = (
            "id",
            "item_tag",
            "material_type",
            "grade_specification",
            "outer_diameter_inches",
            "wall_thickness_mm",
            "schedule",
            "length_meters",
            "quantity",
            "unit_of_measure",
            "heat_number",
            "mill_manufacturer",
            "mtc_number",
            "mtc_type",
            "yield_strength_mpa",
            "tensile_strength_mpa",
            "impact_test_joules",
            "yard_location",
            "bay_rack_position",
            "qr_tag",
            "status",
            "vendor_id",
            "vendor_name",
            "reservation_id",
            "reservation_number",
            "unit_cost_minor",
            "currency",
            "nigerian_content_percent",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "item_tag", "qr_tag", "created_at", "updated_at")


class MaterialIssueSlipItemSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    yard_item_id = serializers.UUIDField(source="yard_item.public_id", read_only=True)
    item_tag = serializers.CharField(source="yard_item.item_tag", read_only=True)
    material_type = serializers.CharField(source="yard_item.material_type", read_only=True)
    heat_number = serializers.CharField(source="yard_item.heat_number", read_only=True)
    grade_specification = serializers.CharField(source="yard_item.grade_specification", read_only=True)
    unit_of_measure = serializers.CharField(source="yard_item.unit_of_measure", read_only=True)

    class Meta:
        model = MaterialIssueSlipItem
        fields = (
            "id",
            "yard_item_id",
            "item_tag",
            "material_type",
            "grade_specification",
            "heat_number",
            "quantity_issued",
            "unit_of_measure",
            "notes",
        )


class MaterialIssueSlipSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    requisition_id = serializers.UUIDField(source="requisition.public_id", read_only=True)
    requisition_number = serializers.CharField(source="requisition.requisition_number", read_only=True)
    issued_by_name = serializers.CharField(source="issued_by.get_full_name", read_only=True)
    items = MaterialIssueSlipItemSerializer(many=True, read_only=True)

    class Meta:
        model = MaterialIssueSlip
        fields = (
            "id",
            "issue_slip_number",
            "requisition_id",
            "requisition_number",
            "issued_to",
            "contractor_name",
            "issued_date",
            "receiver_signature_ref",
            "issued_by_name",
            "items",
            "notes",
            "created_at",
        )
        read_only_fields = ("id", "issue_slip_number", "issued_by_name", "items", "created_at")


class EpcLinkAuditEventSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    actor_name = serializers.CharField(source="actor.get_full_name", read_only=True)

    class Meta:
        model = EpcLinkAuditEvent
        fields = (
            "id",
            "entity_type",
            "entity_id",
            "actor_name",
            "action",
            "from_status",
            "to_status",
            "reason",
            "metadata",
            "created_at",
        )
        read_only_fields = fields
