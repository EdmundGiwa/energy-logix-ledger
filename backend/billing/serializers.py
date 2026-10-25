from rest_framework import serializers

from billing.models import (
    BillingAuditEvent,
    CommercialInvoice,
    CustomerAccount,
    InterimPaymentCertificate,
    InvoiceLineItem,
    PaymentReceipt,
)


class CustomerAccountSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    public_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = CustomerAccount
        fields = (
            "id",
            "public_id",
            "customer_code",
            "name",
            "tax_id",
            "contact_email",
            "contact_phone",
            "billing_address",
            "credit_limit_minor",
            "currency",
            "payment_terms_days",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "public_id", "created_at", "updated_at")


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    public_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = InvoiceLineItem
        fields = (
            "id",
            "public_id",
            "source_module",
            "source_record_id",
            "description",
            "quantity",
            "unit_of_measure",
            "unit_rate_minor",
            "amount_minor",
            "created_at",
        )
        read_only_fields = ("id", "public_id", "amount_minor", "created_at")


class CommercialInvoiceSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    public_id = serializers.UUIDField(read_only=True)
    customer_id = serializers.UUIDField(source="customer.public_id", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    customer_code = serializers.CharField(source="customer.customer_code", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)

    class Meta:
        model = CommercialInvoice
        fields = (
            "id",
            "public_id",
            "customer_id",
            "customer_name",
            "customer_code",
            "invoice_number",
            "currency",
            "exchange_rate_snapshot",
            "issue_date",
            "due_date",
            "subtotal_minor",
            "vat_percent",
            "vat_amount_minor",
            "wht_percent",
            "wht_amount_minor",
            "total_amount_minor",
            "balance_due_minor",
            "status",
            "version",
            "notes",
            "created_by_name",
            "line_items",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "public_id",
            "customer_id",
            "customer_name",
            "customer_code",
            "subtotal_minor",
            "vat_amount_minor",
            "wht_amount_minor",
            "total_amount_minor",
            "balance_due_minor",
            "status",
            "version",
            "created_by_name",
            "line_items",
            "created_at",
            "updated_at",
        )


class InterimPaymentCertificateSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    public_id = serializers.UUIDField(read_only=True)
    customer_id = serializers.UUIDField(source="customer.public_id", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    customer_code = serializers.CharField(source="customer.customer_code", read_only=True)

    class Meta:
        model = InterimPaymentCertificate
        fields = (
            "id",
            "public_id",
            "customer_id",
            "customer_name",
            "customer_code",
            "ipc_number",
            "contract_reference",
            "project_name",
            "valuation_period_start",
            "valuation_period_end",
            "currency",
            "gross_certified_minor",
            "retention_percent",
            "retention_amount_minor",
            "advance_recovery_minor",
            "net_certified_minor",
            "status",
            "qs_sign_off_by",
            "qs_sign_off_at",
            "version",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "public_id",
            "customer_id",
            "customer_name",
            "customer_code",
            "retention_amount_minor",
            "net_certified_minor",
            "status",
            "qs_sign_off_at",
            "version",
            "created_at",
            "updated_at",
        )


class PaymentReceiptSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    public_id = serializers.UUIDField(read_only=True)
    customer_id = serializers.UUIDField(source="customer.public_id", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    invoice_id = serializers.UUIDField(source="invoice.public_id", read_only=True)
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)
    recorded_by_name = serializers.CharField(source="recorded_by.get_full_name", read_only=True)

    class Meta:
        model = PaymentReceipt
        fields = (
            "id",
            "public_id",
            "customer_id",
            "customer_name",
            "invoice_id",
            "invoice_number",
            "receipt_number",
            "payment_method",
            "transaction_reference",
            "amount_minor",
            "currency",
            "payment_date",
            "recorded_by_name",
            "notes",
            "created_at",
        )
        read_only_fields = (
            "id",
            "public_id",
            "customer_id",
            "customer_name",
            "invoice_id",
            "invoice_number",
            "recorded_by_name",
            "created_at",
        )


class BillingAuditEventSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    public_id = serializers.UUIDField(read_only=True)
    actor_name = serializers.CharField(source="actor.get_full_name", read_only=True)

    class Meta:
        model = BillingAuditEvent
        fields = (
            "id",
            "public_id",
            "entity_type",
            "entity_id",
            "actor_name",
            "action",
            "from_status",
            "to_status",
            "amount_minor",
            "reason",
            "metadata",
            "created_at",
        )
        read_only_fields = ("id", "public_id", "actor_name", "created_at")
