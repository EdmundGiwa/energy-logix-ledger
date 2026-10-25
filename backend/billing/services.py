from datetime import date, timedelta
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from billing.models import (
    BillingAuditEvent,
    CommercialInvoice,
    Currency,
    CustomerAccount,
    InterimPaymentCertificate,
    InvoiceLineItem,
    PaymentReceipt,
)


class ConflictError(Exception):
    pass


class BillingService:
    @staticmethod
    def audit(*, organization, entity_type, entity_id, actor, action, from_status="", to_status="", amount_minor=0, reason="", metadata=None):
        return BillingAuditEvent.objects.create(
            organization=organization,
            entity_type=entity_type,
            entity_id=str(entity_id),
            actor=actor,
            action=action,
            from_status=from_status,
            to_status=to_status,
            amount_minor=amount_minor,
            reason=reason,
            metadata=metadata or {},
        )

    @staticmethod
    @transaction.atomic
    def create_customer_account(*, organization, user, data):
        count = CustomerAccount.objects.filter(organization=organization).count() + 1
        customer_code = data.get("customer_code") or f"CUST-{timezone.now().strftime('%Y%m')}-{count:04d}"

        customer = CustomerAccount.objects.create(
            organization=organization,
            customer_code=customer_code,
            name=data["name"],
            tax_id=data.get("tax_id", ""),
            contact_email=data.get("contact_email", ""),
            contact_phone=data.get("contact_phone", ""),
            billing_address=data.get("billing_address", ""),
            credit_limit_minor=int(data.get("credit_limit_minor", 0)),
            currency=data.get("currency", Currency.NGN),
            payment_terms_days=int(data.get("payment_terms_days", 30)),
        )

        BillingService.audit(
            organization=organization,
            entity_type="CustomerAccount",
            entity_id=customer.public_id,
            actor=user,
            action="create_customer",
            to_status="active",
            reason=f"Registered customer account {customer.name} ({customer.customer_code})",
        )
        return customer

    @staticmethod
    @transaction.atomic
    def create_invoice(*, organization, user, customer, data):
        if customer.organization_id != organization.id:
            raise ValidationError("Customer does not belong to organization.")

        count = CommercialInvoice.objects.filter(organization=organization).count() + 1
        invoice_number = data.get("invoice_number") or f"INV-{timezone.now().strftime('%Y%m')}-{count:04d}"

        issue_date = data.get("issue_date") or timezone.now().date()
        if isinstance(issue_date, str):
            issue_date = date.fromisoformat(issue_date)

        due_date = data.get("due_date")
        if not due_date:
            due_date = issue_date + timedelta(days=customer.payment_terms_days)
        elif isinstance(due_date, str):
            due_date = date.fromisoformat(due_date)

        currency = data.get("currency") or customer.currency
        exchange_rate = Decimal(str(data.get("exchange_rate_snapshot", "1.0000")))
        vat_percent = Decimal(str(data.get("vat_percent", "7.50")))
        wht_percent = Decimal(str(data.get("wht_percent", "5.00")))

        invoice = CommercialInvoice.objects.create(
            organization=organization,
            customer=customer,
            invoice_number=invoice_number,
            currency=currency,
            exchange_rate_snapshot=exchange_rate,
            issue_date=issue_date,
            due_date=due_date,
            vat_percent=vat_percent,
            wht_percent=wht_percent,
            status=CommercialInvoice.Status.DRAFT,
            notes=data.get("notes", ""),
            created_by=user,
        )

        raw_items = data.get("line_items", [])
        subtotal = 0
        for item_data in raw_items:
            qty = Decimal(str(item_data.get("quantity", 1)))
            unit_rate = int(item_data["unit_rate_minor"])
            amount = int(round(qty * unit_rate))
            subtotal += amount

            InvoiceLineItem.objects.create(
                organization=organization,
                invoice=invoice,
                source_module=item_data.get("source_module", ""),
                source_record_id=item_data.get("source_record_id", ""),
                description=item_data["description"],
                quantity=qty,
                unit_of_measure=item_data.get("unit_of_measure", "unit"),
                unit_rate_minor=unit_rate,
                amount_minor=amount,
            )

        vat_amount = int(round(Decimal(subtotal) * (vat_percent / Decimal(100))))
        wht_amount = int(round(Decimal(subtotal) * (wht_percent / Decimal(100))))
        total_amount = subtotal + vat_amount

        invoice.subtotal_minor = subtotal
        invoice.vat_amount_minor = vat_amount
        invoice.wht_amount_minor = wht_amount
        invoice.total_amount_minor = total_amount
        invoice.balance_due_minor = total_amount
        invoice.save()

        BillingService.audit(
            organization=organization,
            entity_type="CommercialInvoice",
            entity_id=invoice.public_id,
            actor=user,
            action="create_invoice",
            to_status=invoice.status,
            amount_minor=total_amount,
            reason=f"Created invoice {invoice.invoice_number} for {customer.name}",
        )
        return invoice

    @staticmethod
    @transaction.atomic
    def issue_invoice(*, organization, user, invoice, version, reason=""):
        if invoice.organization_id != organization.id:
            raise ValidationError("Invoice does not belong to organization.")

        if invoice.version != version:
            raise ConflictError(f"Stale invoice version. Expected {invoice.version}, got {version}.")

        if invoice.status != CommercialInvoice.Status.DRAFT:
            raise ValidationError(f"Cannot issue invoice from status '{invoice.status}'.")

        from_status = invoice.status
        invoice.status = CommercialInvoice.Status.ISSUED
        invoice.version += 1
        invoice.save()

        BillingService.audit(
            organization=organization,
            entity_type="CommercialInvoice",
            entity_id=invoice.public_id,
            actor=user,
            action="issue_invoice",
            from_status=from_status,
            to_status=invoice.status,
            amount_minor=invoice.total_amount_minor,
            reason=reason or f"Issued invoice {invoice.invoice_number} to {invoice.customer.name}",
        )
        return invoice

    @staticmethod
    @transaction.atomic
    def cancel_invoice(*, organization, user, invoice, version, reason=""):
        if invoice.organization_id != organization.id:
            raise ValidationError("Invoice does not belong to organization.")

        if invoice.version != version:
            raise ConflictError(f"Stale invoice version. Expected {invoice.version}, got {version}.")

        if invoice.status in (CommercialInvoice.Status.PAID, CommercialInvoice.Status.CANCELLED):
            raise ValidationError(f"Cannot cancel invoice in status '{invoice.status}'.")

        from_status = invoice.status
        invoice.status = CommercialInvoice.Status.CANCELLED
        invoice.balance_due_minor = 0
        invoice.version += 1
        invoice.save()

        BillingService.audit(
            organization=organization,
            entity_type="CommercialInvoice",
            entity_id=invoice.public_id,
            actor=user,
            action="cancel_invoice",
            from_status=from_status,
            to_status=invoice.status,
            amount_minor=invoice.total_amount_minor,
            reason=reason or f"Cancelled invoice {invoice.invoice_number}",
        )
        return invoice

    @staticmethod
    @transaction.atomic
    def record_payment(*, organization, user, data):
        customer = CustomerAccount.objects.get(organization=organization, public_id=data["customer_id"])

        count = PaymentReceipt.objects.filter(organization=organization).count() + 1
        receipt_number = data.get("receipt_number") or f"RCT-{timezone.now().strftime('%Y%m')}-{count:04d}"

        amount_minor = int(data["amount_minor"])
        if amount_minor <= 0:
            raise ValidationError("Payment amount must be greater than zero.")

        payment_date = data.get("payment_date") or timezone.now().date()
        if isinstance(payment_date, str):
            payment_date = date.fromisoformat(payment_date)

        invoice = None
        if data.get("invoice_id"):
            invoice = CommercialInvoice.objects.get(organization=organization, public_id=data["invoice_id"])
            if invoice.customer_id != customer.id:
                raise ValidationError("Invoice does not belong to specified customer.")

        receipt = PaymentReceipt.objects.create(
            organization=organization,
            customer=customer,
            invoice=invoice,
            receipt_number=receipt_number,
            payment_method=data.get("payment_method", PaymentReceipt.PaymentMethod.BANK_TRANSFER),
            transaction_reference=data["transaction_reference"],
            amount_minor=amount_minor,
            currency=data.get("currency") or customer.currency,
            payment_date=payment_date,
            recorded_by=user,
            notes=data.get("notes", ""),
        )

        if invoice:
            new_balance = invoice.balance_due_minor - amount_minor
            if new_balance <= 0:
                invoice.balance_due_minor = 0
                invoice.status = CommercialInvoice.Status.PAID
            else:
                invoice.balance_due_minor = new_balance
                invoice.status = CommercialInvoice.Status.PARTIALLY_PAID
            invoice.version += 1
            invoice.save()

        BillingService.audit(
            organization=organization,
            entity_type="PaymentReceipt",
            entity_id=receipt.public_id,
            actor=user,
            action="record_payment",
            to_status="posted",
            amount_minor=amount_minor,
            reason=f"Recorded payment {receipt.receipt_number} of {receipt.currency} {amount_minor / 100:.2f} for {customer.name}",
        )
        return receipt

    @staticmethod
    @transaction.atomic
    def create_ipc(*, organization, user, customer, data):
        if customer.organization_id != organization.id:
            raise ValidationError("Customer does not belong to organization.")

        count = InterimPaymentCertificate.objects.filter(organization=organization).count() + 1
        ipc_number = data.get("ipc_number") or f"IPC-{timezone.now().strftime('%Y%m')}-{count:04d}"

        gross_certified = int(data["gross_certified_minor"])
        retention_pct = Decimal(str(data.get("retention_percent", "5.00")))
        retention_amt = int(round(Decimal(gross_certified) * (retention_pct / Decimal(100))))
        advance_recovery = int(data.get("advance_recovery_minor", 0))
        net_certified = gross_certified - retention_amt - advance_recovery

        start_date = data["valuation_period_start"]
        if isinstance(start_date, str):
            start_date = date.fromisoformat(start_date)

        end_date = data["valuation_period_end"]
        if isinstance(end_date, str):
            end_date = date.fromisoformat(end_date)

        ipc = InterimPaymentCertificate.objects.create(
            organization=organization,
            customer=customer,
            ipc_number=ipc_number,
            contract_reference=data["contract_reference"],
            project_name=data["project_name"],
            valuation_period_start=start_date,
            valuation_period_end=end_date,
            currency=data.get("currency") or customer.currency,
            gross_certified_minor=gross_certified,
            retention_percent=retention_pct,
            retention_amount_minor=retention_amt,
            advance_recovery_minor=advance_recovery,
            net_certified_minor=net_certified,
            status=InterimPaymentCertificate.Status.DRAFT,
            notes=data.get("notes", ""),
        )

        BillingService.audit(
            organization=organization,
            entity_type="InterimPaymentCertificate",
            entity_id=ipc.public_id,
            actor=user,
            action="create_ipc",
            to_status=ipc.status,
            amount_minor=net_certified,
            reason=f"Created IPC {ipc.ipc_number} for {ipc.project_name}",
        )
        return ipc

    @staticmethod
    @transaction.atomic
    def certify_ipc(*, organization, user, ipc, qs_sign_off_by, version, reason=""):
        if ipc.organization_id != organization.id:
            raise ValidationError("IPC does not belong to organization.")

        if ipc.version != version:
            raise ConflictError(f"Stale IPC version. Expected {ipc.version}, got {version}.")

        from_status = ipc.status
        ipc.status = InterimPaymentCertificate.Status.QS_CERTIFIED
        ipc.qs_sign_off_by = qs_sign_off_by
        ipc.qs_sign_off_at = timezone.now()
        ipc.version += 1
        ipc.save()

        BillingService.audit(
            organization=organization,
            entity_type="InterimPaymentCertificate",
            entity_id=ipc.public_id,
            actor=user,
            action="certify_ipc",
            from_status=from_status,
            to_status=ipc.status,
            amount_minor=ipc.net_certified_minor,
            reason=reason or f"QS certification signed off by {qs_sign_off_by}",
        )
        return ipc

    @staticmethod
    @transaction.atomic
    def approve_ipc(*, organization, user, ipc, version, reason=""):
        if ipc.organization_id != organization.id:
            raise ValidationError("IPC does not belong to organization.")

        if ipc.version != version:
            raise ConflictError(f"Stale IPC version. Expected {ipc.version}, got {version}.")

        from_status = ipc.status
        ipc.status = InterimPaymentCertificate.Status.APPROVED
        ipc.version += 1
        ipc.save()

        BillingService.audit(
            organization=organization,
            entity_type="InterimPaymentCertificate",
            entity_id=ipc.public_id,
            actor=user,
            action="approve_ipc",
            from_status=from_status,
            to_status=ipc.status,
            amount_minor=ipc.net_certified_minor,
            reason=reason or "Project director approved IPC for client invoicing",
        )
        return ipc

    @staticmethod
    def get_customer_statement(*, organization, customer):
        today = date.today()
        invoices = CommercialInvoice.objects.filter(
            organization=organization, customer=customer
        ).exclude(status=CommercialInvoice.Status.CANCELLED).order_by("issue_date")

        payments = PaymentReceipt.objects.filter(
            organization=organization, customer=customer
        ).order_by("payment_date")

        ledger = []
        for inv in invoices:
            ledger.append({
                "date": str(inv.issue_date),
                "type": "invoice",
                "reference": inv.invoice_number,
                "description": f"Invoice {inv.invoice_number} ({inv.status})",
                "debit_minor": inv.total_amount_minor,
                "credit_minor": 0,
            })

        for pmt in payments:
            ledger.append({
                "date": str(pmt.payment_date),
                "type": "payment",
                "reference": pmt.receipt_number,
                "description": f"Payment {pmt.receipt_number} ({pmt.payment_method}) - Ref: {pmt.transaction_reference}",
                "debit_minor": 0,
                "credit_minor": pmt.amount_minor,
            })

        ledger.sort(key=lambda x: x["date"])

        running_balance = 0
        for entry in ledger:
            running_balance += (entry["debit_minor"] - entry["credit_minor"])
            entry["running_balance_minor"] = running_balance

        # Ageing analysis of open invoices
        open_invoices = invoices.filter(balance_due_minor__gt=0)
        current_0_30 = 0
        overdue_31_60 = 0
        overdue_61_90 = 0
        overdue_90_plus = 0

        for inv in open_invoices:
            due = inv.due_date
            if isinstance(due, str):
                due = date.fromisoformat(due)
            overdue_days = (today - due).days
            bal = inv.balance_due_minor

            if overdue_days <= 0:
                current_0_30 += bal
            elif overdue_days <= 30:
                current_0_30 += bal
            elif overdue_days <= 60:
                overdue_31_60 += bal
            elif overdue_days <= 90:
                overdue_61_90 += bal
            else:
                overdue_90_plus += bal

        total_outstanding = current_0_30 + overdue_31_60 + overdue_61_90 + overdue_90_plus

        return {
            "customer_code": customer.customer_code,
            "customer_name": customer.name,
            "currency": customer.currency,
            "total_outstanding_minor": total_outstanding,
            "ageing": {
                "current_0_30_minor": current_0_30,
                "overdue_31_60_minor": overdue_31_60,
                "overdue_61_90_minor": overdue_61_90,
                "overdue_90_plus_minor": overdue_90_plus,
            },
            "ledger": ledger,
        }
