from django.contrib import admin

from billing.models import (
    BillingAuditEvent,
    CommercialInvoice,
    CustomerAccount,
    InterimPaymentCertificate,
    InvoiceLineItem,
    PaymentReceipt,
)
from organizations.models import Membership


class TenantScopedAdmin(admin.ModelAdmin):
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if request.user.is_superuser:
            return queryset
        organizations = Membership.objects.filter(user=request.user, is_active=True).values("organization_id")
        return queryset.filter(organization_id__in=organizations)

    def has_view_permission(self, request, obj=None):
        allowed = super().has_view_permission(request, obj)
        if not allowed or obj is None or request.user.is_superuser:
            return allowed
        return Membership.objects.filter(user=request.user, organization=obj.organization, is_active=True).exists()

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class InvoiceLineItemInline(admin.TabularInline):
    model = InvoiceLineItem
    extra = 0
    readonly_fields = ("description", "quantity", "unit_of_measure", "unit_rate_minor", "amount_minor", "source_module", "source_record_id")
    can_delete = False


@admin.register(CustomerAccount)
class CustomerAccountAdmin(TenantScopedAdmin):
    list_display = ("customer_code", "name", "currency", "credit_limit_minor", "payment_terms_days", "is_active", "organization")
    list_filter = ("organization", "currency", "is_active")
    search_fields = ("customer_code", "name", "tax_id", "contact_email")
    readonly_fields = ("public_id", "created_at", "updated_at")


@admin.register(CommercialInvoice)
class CommercialInvoiceAdmin(TenantScopedAdmin):
    list_display = (
        "invoice_number", "customer", "currency", "issue_date", "due_date",
        "total_amount_minor", "balance_due_minor", "status", "version", "organization",
    )
    list_filter = ("organization", "status", "currency")
    search_fields = ("invoice_number", "customer__name", "notes")
    readonly_fields = (
        "public_id", "subtotal_minor", "vat_amount_minor", "wht_amount_minor",
        "total_amount_minor", "balance_due_minor", "version", "created_by", "created_at", "updated_at",
    )
    inlines = (InvoiceLineItemInline,)


@admin.register(InterimPaymentCertificate)
class InterimPaymentCertificateAdmin(TenantScopedAdmin):
    list_display = (
        "ipc_number", "customer", "project_name", "valuation_period_end",
        "gross_certified_minor", "net_certified_minor", "status", "organization",
    )
    list_filter = ("organization", "status", "currency")
    search_fields = ("ipc_number", "project_name", "contract_reference", "customer__name")
    readonly_fields = (
        "public_id", "gross_certified_minor", "retention_amount_minor", "advance_recovery_minor",
        "net_certified_minor", "qs_sign_off_at", "version", "created_at", "updated_at",
    )


@admin.register(PaymentReceipt)
class PaymentReceiptAdmin(TenantScopedAdmin):
    list_display = ("receipt_number", "customer", "invoice", "payment_method", "amount_minor", "currency", "payment_date", "organization")
    list_filter = ("organization", "payment_method", "currency")
    search_fields = ("receipt_number", "transaction_reference", "customer__name")
    readonly_fields = ("public_id", "amount_minor", "recorded_by", "created_at")


@admin.register(BillingAuditEvent)
class BillingAuditEventAdmin(TenantScopedAdmin):
    list_display = ("action", "entity_type", "entity_id", "actor", "from_status", "to_status", "amount_minor", "created_at", "organization")
    list_filter = ("organization", "entity_type", "action")
    search_fields = ("entity_id", "action", "reason")
    readonly_fields = ("public_id", "entity_type", "entity_id", "actor", "action", "from_status", "to_status", "amount_minor", "reason", "metadata", "created_at")
