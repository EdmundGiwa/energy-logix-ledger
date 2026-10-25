from rest_framework import serializers

from compliance_shield.models import (
    AuditNonConformance,
    ComplianceAuditEvent,
    ComplianceEvidencePack,
    IsoManagementSystemAudit,
    RegulatoryCertificate,
)


class RegulatoryCertificateSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    public_id = serializers.UUIDField(read_only=True)
    days_to_expiry = serializers.IntegerField(read_only=True)
    urgency_tier = serializers.CharField(read_only=True)
    verified_by_name = serializers.CharField(source="verified_by.get_full_name", read_only=True)

    class Meta:
        model = RegulatoryCertificate
        fields = (
            "id",
            "public_id",
            "regulator",
            "certificate_type",
            "certificate_number",
            "issuing_authority",
            "issue_date",
            "expiry_date",
            "status",
            "days_to_expiry",
            "urgency_tier",
            "document_reference",
            "verified_by_name",
            "verified_at",
            "renewal_tracking_number",
            "version",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "public_id",
            "days_to_expiry",
            "urgency_tier",
            "verified_by_name",
            "verified_at",
            "version",
            "created_at",
            "updated_at",
        )


class AuditNonConformanceSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    public_id = serializers.UUIDField(read_only=True)
    audit_id = serializers.UUIDField(source="audit.public_id", read_only=True)

    class Meta:
        model = AuditNonConformance
        fields = (
            "id",
            "public_id",
            "audit_id",
            "ncr_number",
            "severity",
            "finding_description",
            "root_cause_analysis",
            "corrective_action_plan",
            "target_closure_date",
            "closed_at",
            "status",
            "assigned_to",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "public_id", "audit_id", "closed_at", "created_at", "updated_at")


class IsoManagementSystemAuditSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    public_id = serializers.UUIDField(read_only=True)
    ncrs = AuditNonConformanceSerializer(many=True, read_only=True)

    class Meta:
        model = IsoManagementSystemAudit
        fields = (
            "id",
            "public_id",
            "standard",
            "audit_type",
            "audit_scope",
            "certification_body",
            "lead_auditor",
            "audit_date",
            "next_audit_due",
            "overall_outcome",
            "open_ncrs_count",
            "closed_ncrs_count",
            "certificate_number",
            "ncrs",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "public_id", "open_ncrs_count", "closed_ncrs_count", "ncrs", "created_at", "updated_at")


class ComplianceEvidencePackSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    public_id = serializers.UUIDField(read_only=True)
    compiled_by_name = serializers.CharField(source="compiled_by.get_full_name", read_only=True)

    class Meta:
        model = ComplianceEvidencePack
        fields = (
            "id",
            "public_id",
            "pack_name",
            "target_stakeholder",
            "status",
            "dossier_data",
            "compiled_by_name",
            "compiled_at",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "public_id", "compiled_by_name", "compiled_at", "created_at", "updated_at")


class ComplianceAuditEventSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    public_id = serializers.UUIDField(read_only=True)
    actor_name = serializers.CharField(source="actor.get_full_name", read_only=True)

    class Meta:
        model = ComplianceAuditEvent
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
