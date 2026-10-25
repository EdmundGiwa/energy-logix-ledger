import uuid
from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from organizations.models import Organization


class Currency(models.TextChoices):
    NGN = "NGN", "Nigerian Naira (NGN)"
    USD = "USD", "US Dollar (USD)"


class CustomerAccount(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="customer_accounts")
    customer_code = models.CharField(max_length=40)
    name = models.CharField(max_length=150)
    tax_id = models.CharField(max_length=50, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    billing_address = models.TextField(blank=True)
    credit_limit_minor = models.BigIntegerField(default=0)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.NGN)
    payment_terms_days = models.PositiveIntegerField(default=30)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)
        constraints = [
            models.UniqueConstraint(fields=("organization", "customer_code"), name="unique_customer_per_org"),
        ]
        indexes = [
            models.Index(fields=("organization", "is_active"), name="cust_active_idx"),
        ]

    def __str__(self):
        return f"{self.name} ({self.customer_code})"


class CommercialInvoice(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft Invoice"
        ISSUED = "issued", "Issued to Customer"
        PARTIALLY_PAID = "partially_paid", "Partially Paid"
        PAID = "paid", "Fully Settled"
        OVERDUE = "overdue", "Overdue Payment"
        CANCELLED = "cancelled", "Cancelled / Void"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="commercial_invoices")
    customer = models.ForeignKey(CustomerAccount, on_delete=models.PROTECT, related_name="invoices")
    invoice_number = models.CharField(max_length=50)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.NGN)
    exchange_rate_snapshot = models.DecimalField(max_digits=12, decimal_places=4, default=Decimal("1.0000"))
    issue_date = models.DateField(default=timezone.now)
    due_date = models.DateField()

    # Amounts in integer minor units (Kobo for NGN, Cents for USD)
    subtotal_minor = models.BigIntegerField(default=0)
    vat_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("7.50"))
    vat_amount_minor = models.BigIntegerField(default=0)
    wht_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("5.00"))
    wht_amount_minor = models.BigIntegerField(default=0)
    total_amount_minor = models.BigIntegerField(default=0)
    balance_due_minor = models.BigIntegerField(default=0)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    version = models.PositiveIntegerField(default=1)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="created_invoices")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-issue_date", "-created_at")
        constraints = [
            models.UniqueConstraint(fields=("organization", "invoice_number"), name="unique_invoice_number_per_org"),
        ]
        indexes = [
            models.Index(fields=("organization", "status"), name="invoice_status_idx"),
            models.Index(fields=("organization", "due_date"), name="invoice_due_date_idx"),
        ]

    def clean(self):
        if self.customer_id and self.customer.organization_id != self.organization_id:
            raise ValidationError("Customer account must belong to the same organization.")
        if self.due_date and self.issue_date and self.due_date < self.issue_date:
            raise ValidationError("Due date cannot precede issue date.")

    def __str__(self):
        return f"{self.invoice_number} - {self.customer.name} ({self.currency} {self.total_amount_minor / 100:.2f})"


class InvoiceLineItem(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="invoice_line_items")
    invoice = models.ForeignKey(CommercialInvoice, on_delete=models.CASCADE, related_name="line_items")
    source_module = models.CharField(max_length=40, blank=True)
    source_record_id = models.CharField(max_length=80, blank=True)
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=12, decimal_places=3, default=Decimal("1.000"))
    unit_of_measure = models.CharField(max_length=30, default="unit")
    unit_rate_minor = models.BigIntegerField()
    amount_minor = models.BigIntegerField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("id",)
        indexes = [
            models.Index(fields=("organization", "invoice"), name="inv_line_invoice_idx"),
        ]

    def clean(self):
        if self.invoice_id and self.invoice.organization_id != self.organization_id:
            raise ValidationError("Invoice must belong to the same organization.")

    def __str__(self):
        return f"{self.description} ({self.quantity} {self.unit_of_measure} @ {self.unit_rate_minor})"


class InterimPaymentCertificate(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft IPC"
        SUBMITTED = "submitted", "Submitted to Client QS"
        QS_CERTIFIED = "qs_certified", "QS Certified"
        APPROVED = "approved", "Approved by Project Director"
        INVOICED = "invoiced", "Invoiced against Contract"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="ipcs")
    customer = models.ForeignKey(CustomerAccount, on_delete=models.PROTECT, related_name="ipcs")
    ipc_number = models.CharField(max_length=50)
    contract_reference = models.CharField(max_length=100)
    project_name = models.CharField(max_length=150)
    valuation_period_start = models.DateField()
    valuation_period_end = models.DateField()
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.NGN)

    gross_certified_minor = models.BigIntegerField()
    retention_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("5.00"))
    retention_amount_minor = models.BigIntegerField(default=0)
    advance_recovery_minor = models.BigIntegerField(default=0)
    net_certified_minor = models.BigIntegerField()

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    qs_sign_off_by = models.CharField(max_length=120, blank=True)
    qs_sign_off_at = models.DateTimeField(null=True, blank=True)
    version = models.PositiveIntegerField(default=1)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-valuation_period_end", "-created_at")
        constraints = [
            models.UniqueConstraint(fields=("organization", "ipc_number"), name="unique_ipc_number_per_org"),
        ]
        indexes = [
            models.Index(fields=("organization", "status"), name="ipc_status_idx"),
        ]

    def clean(self):
        if self.customer_id and self.customer.organization_id != self.organization_id:
            raise ValidationError("Customer account must belong to the same organization.")

    def __str__(self):
        return f"{self.ipc_number} - {self.project_name} ({self.currency} {self.net_certified_minor / 100:.2f})"


class PaymentReceipt(models.Model):
    class PaymentMethod(models.TextChoices):
        BANK_TRANSFER = "bank_transfer", "Direct Bank Transfer / NIP"
        PAYSTACK_LINK = "paystack_link", "Paystack Payment Gateway"
        FLUTTERWAVE_LINK = "flutterwave_link", "Flutterwave Payment Gateway"
        CHEQUE = "cheque", "Bank Draft / Cheque"
        CASH = "cash", "Cash / Petty Cash"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="payment_receipts")
    customer = models.ForeignKey(CustomerAccount, on_delete=models.PROTECT, related_name="payments")
    invoice = models.ForeignKey(CommercialInvoice, on_delete=models.PROTECT, related_name="payments", null=True, blank=True)
    receipt_number = models.CharField(max_length=50)
    payment_method = models.CharField(max_length=30, choices=PaymentMethod.choices, default=PaymentMethod.BANK_TRANSFER)
    transaction_reference = models.CharField(max_length=100)
    amount_minor = models.BigIntegerField()
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.NGN)
    payment_date = models.DateField(default=timezone.now)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="recorded_payments")
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-payment_date", "-created_at")
        constraints = [
            models.UniqueConstraint(fields=("organization", "receipt_number"), name="unique_receipt_number_per_org"),
        ]
        indexes = [
            models.Index(fields=("organization", "payment_date"), name="receipt_date_idx"),
        ]

    def clean(self):
        if self.customer_id and self.customer.organization_id != self.organization_id:
            raise ValidationError("Customer account must belong to the same organization.")
        if self.invoice_id and self.invoice.organization_id != self.organization_id:
            raise ValidationError("Invoice must belong to the same organization.")

    def __str__(self):
        return f"{self.receipt_number} - {self.currency} {self.amount_minor / 100:.2f} ({self.customer.name})"


class BillingAuditEvent(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="billing_audit_events")
    entity_type = models.CharField(max_length=60)
    entity_id = models.CharField(max_length=60)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="billing_audit_actions")
    action = models.CharField(max_length=60)
    from_status = models.CharField(max_length=30, blank=True)
    to_status = models.CharField(max_length=30, blank=True)
    amount_minor = models.BigIntegerField(default=0)
    reason = models.TextField(blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("organization", "-created_at"), name="billing_audit_idx"),
        ]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Billing audit records are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Billing audit records are immutable.")

    def __str__(self):
        return f"{self.action} on {self.entity_type}:{self.entity_id} by {self.actor} at {self.created_at}"
