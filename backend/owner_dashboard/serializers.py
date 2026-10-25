from rest_framework import serializers

from owner_dashboard.models import (
    Currency,
    ExecutiveExceptionAlert,
    ExecutiveExportJob,
    ExecutiveKpiSnapshot,
)


class ExecutiveKpiSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExecutiveKpiSnapshot
        fields = [
            "public_id",
            "as_of_date",
            "currency",
            "gross_billed_minor",
            "collected_minor",
            "outstanding_receivables_minor",
            "ipc_retention_held_minor",
            "product_delivered_tonnage",
            "avg_shrinkage_percent",
            "avg_turnaround_hours",
            "reconciliation_rate_percent",
            "active_field_jobs_count",
            "critical_risk_items_count",
            "warning_risk_items_count",
            "module_breakdown",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ExecutiveExceptionAlertSerializer(serializers.ModelSerializer):
    acknowledged_by_email = serializers.EmailField(source="acknowledged_by.email", read_only=True)

    class Meta:
        model = ExecutiveExceptionAlert
        fields = [
            "public_id",
            "severity",
            "module",
            "title",
            "description",
            "source_record_type",
            "source_record_id",
            "source_url",
            "variance_percent",
            "is_acknowledged",
            "acknowledged_by_email",
            "acknowledged_at",
            "created_at",
        ]
        read_only_fields = ["public_id", "is_acknowledged", "acknowledged_by_email", "acknowledged_at", "created_at"]


class CreateExceptionRequestSerializer(serializers.Serializer):
    severity = serializers.ChoiceField(choices=ExecutiveExceptionAlert.Severity.choices)
    module = serializers.ChoiceField(choices=ExecutiveExceptionAlert.ModuleSource.choices)
    title = serializers.CharField(max_length=200)
    description = serializers.CharField()
    source_record_type = serializers.CharField(max_length=100)
    source_record_id = serializers.CharField(max_length=100)
    source_url = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    variance_percent = serializers.DecimalField(max_digits=6, decimal_places=3, required=False, allow_null=True, default=None)


class ExecutiveExportJobSerializer(serializers.ModelSerializer):
    requested_by_email = serializers.EmailField(source="requested_by.email", read_only=True)

    class Meta:
        model = ExecutiveExportJob
        fields = [
            "public_id",
            "requested_by_email",
            "report_type",
            "filters",
            "status",
            "file_format",
            "file_size_bytes",
            "download_checksum",
            "completed_at",
            "created_at",
        ]
        read_only_fields = fields


class RequestExportJobSerializer(serializers.Serializer):
    report_type = serializers.ChoiceField(choices=ExecutiveExportJob.ReportType.choices)
    filters = serializers.DictField(required=False, default=dict)
    file_format = serializers.ChoiceField(choices=ExecutiveExportJob.FileFormat.choices, required=False, default=ExecutiveExportJob.FileFormat.PDF)
