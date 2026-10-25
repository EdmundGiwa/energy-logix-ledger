from datetime import date
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q, Sum
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from billing.models import (
    CommercialInvoice,
    CustomerAccount,
    InterimPaymentCertificate,
    PaymentReceipt,
)
from billing.permissions import can_approve_commercial, can_manage_billing
from billing.serializers import (
    CommercialInvoiceSerializer,
    CustomerAccountSerializer,
    InterimPaymentCertificateSerializer,
    PaymentReceiptSerializer,
)
from billing.services import BillingService, ConflictError
from organizations.context import resolve_membership


class StandardPagination(PageNumberPagination):
    page_size = 20
    max_page_size = 100
    page_size_query_param = "page_size"


def get_scoped_customer(membership, public_id):
    try:
        return CustomerAccount.objects.get(organization=membership.organization, public_id=public_id)
    except CustomerAccount.DoesNotExist:
        raise NotFound("Customer account not found.")


def get_scoped_invoice(membership, public_id):
    try:
        return CommercialInvoice.objects.select_related("customer", "created_by").prefetch_related("line_items").get(
            organization=membership.organization, public_id=public_id
        )
    except CommercialInvoice.DoesNotExist:
        raise NotFound("Commercial invoice not found.")


def get_scoped_ipc(membership, public_id):
    try:
        return InterimPaymentCertificate.objects.select_related("customer").get(
            organization=membership.organization, public_id=public_id
        )
    except InterimPaymentCertificate.DoesNotExist:
        raise NotFound("Interim payment certificate not found.")


class BillingSummaryView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        org = membership.organization
        today = date.today()

        invoices = CommercialInvoice.objects.filter(organization=org)
        non_cancelled = invoices.exclude(status=CommercialInvoice.Status.CANCELLED)

        total_billed = non_cancelled.aggregate(s=Sum("total_amount_minor"))["s"] or 0
        total_outstanding = non_cancelled.aggregate(s=Sum("balance_due_minor"))["s"] or 0
        total_collected = PaymentReceipt.objects.filter(organization=org).aggregate(s=Sum("amount_minor"))["s"] or 0

        total_invoices = invoices.count()
        paid_invoices = invoices.filter(status=CommercialInvoice.Status.PAID).count()
        overdue_invoices = invoices.filter(
            due_date__lt=today, balance_due_minor__gt=0
        ).exclude(status=CommercialInvoice.Status.CANCELLED).count()

        total_customers = CustomerAccount.objects.filter(organization=org, is_active=True).count()
        total_ipcs = InterimPaymentCertificate.objects.filter(organization=org).count()
        approved_ipcs = InterimPaymentCertificate.objects.filter(
            organization=org, status__in=[InterimPaymentCertificate.Status.APPROVED, InterimPaymentCertificate.Status.INVOICED]
        ).count()

        return Response({
            "total_billed_minor": total_billed,
            "total_collected_minor": total_collected,
            "total_outstanding_minor": total_outstanding,
            "total_invoices_count": total_invoices,
            "paid_invoices_count": paid_invoices,
            "overdue_invoices_count": overdue_invoices,
            "total_customers_count": total_customers,
            "total_ipcs_count": total_ipcs,
            "approved_ipcs_count": approved_ipcs,
        })


class CustomerAccountListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = CustomerAccount.objects.filter(organization=membership.organization)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(customer_code__icontains=search) | Q(tax_id__icontains=search))

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = CustomerAccountSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_manage_billing(membership):
            raise PermissionDenied("Only authorized commercial personnel can register customers.")

        try:
            customer = BillingService.create_customer_account(
                organization=membership.organization,
                user=request.user,
                data=request.data,
            )
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))
        except KeyError as exc:
            raise ValidationError(f"Missing required field: {exc}")

        return Response(CustomerAccountSerializer(customer).data, status=status.HTTP_201_CREATED)


class CustomerAccountDetailView(APIView):
    def get(self, request, public_id):
        membership = resolve_membership(request)
        customer = get_scoped_customer(membership, public_id)
        return Response(CustomerAccountSerializer(customer).data)


class CustomerStatementView(APIView):
    def get(self, request, public_id):
        membership = resolve_membership(request)
        customer = get_scoped_customer(membership, public_id)
        statement = BillingService.get_customer_statement(
            organization=membership.organization,
            customer=customer,
        )
        return Response(statement)


class CommercialInvoiceListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = CommercialInvoice.objects.filter(organization=membership.organization).select_related("customer", "created_by").prefetch_related("line_items")

        status_param = request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        customer_id = request.query_params.get("customer_id")
        if customer_id:
            qs = qs.filter(customer__public_id=customer_id)

        currency = request.query_params.get("currency")
        if currency:
            qs = qs.filter(currency=currency)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(invoice_number__icontains=search)
                | Q(customer__name__icontains=search)
                | Q(notes__icontains=search)
            )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = CommercialInvoiceSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_manage_billing(membership):
            raise PermissionDenied("Only authorized commercial staff can generate invoices.")

        customer_id = request.data.get("customer_id")
        if not customer_id:
            raise ValidationError({"customer_id": "customer_id is required."})

        customer = get_scoped_customer(membership, customer_id)

        try:
            invoice = BillingService.create_invoice(
                organization=membership.organization,
                user=request.user,
                customer=customer,
                data=request.data,
            )
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))
        except KeyError as exc:
            raise ValidationError(f"Missing required field: {exc}")

        return Response(CommercialInvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)


class CommercialInvoiceDetailView(APIView):
    def get(self, request, public_id):
        membership = resolve_membership(request)
        invoice = get_scoped_invoice(membership, public_id)
        return Response(CommercialInvoiceSerializer(invoice).data)


class CommercialInvoiceActionView(APIView):
    def post(self, request, public_id, action):
        membership = resolve_membership(request)
        invoice = get_scoped_invoice(membership, public_id)

        version = request.data.get("version")
        if version is None:
            raise ValidationError({"version": "Current invoice version is required."})

        reason = request.data.get("reason", "")

        try:
            if action == "issue":
                updated = BillingService.issue_invoice(
                    organization=membership.organization,
                    user=request.user,
                    invoice=invoice,
                    version=int(version),
                    reason=reason,
                )
            elif action == "cancel":
                if not can_approve_commercial(membership):
                    raise PermissionDenied("Only commercial managers can cancel invoices.")
                updated = BillingService.cancel_invoice(
                    organization=membership.organization,
                    user=request.user,
                    invoice=invoice,
                    version=int(version),
                    reason=reason,
                )
            else:
                raise ValidationError(f"Unknown invoice action '{action}'.")
        except ConflictError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))

        return Response(CommercialInvoiceSerializer(updated).data)


class PaymentReceiptListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = PaymentReceipt.objects.filter(organization=membership.organization).select_related("customer", "invoice", "recorded_by")

        customer_id = request.query_params.get("customer_id")
        if customer_id:
            qs = qs.filter(customer__public_id=customer_id)

        invoice_id = request.query_params.get("invoice_id")
        if invoice_id:
            qs = qs.filter(invoice__public_id=invoice_id)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = PaymentReceiptSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_manage_billing(membership):
            raise PermissionDenied("Only authorized staff can post payment receipts.")

        try:
            receipt = BillingService.record_payment(
                organization=membership.organization,
                user=request.user,
                data=request.data,
            )
        except CustomerAccount.DoesNotExist:
            raise NotFound("Customer account not found.")
        except CommercialInvoice.DoesNotExist:
            raise NotFound("Invoice not found.")
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))
        except KeyError as exc:
            raise ValidationError(f"Missing required field: {exc}")

        return Response(PaymentReceiptSerializer(receipt).data, status=status.HTTP_201_CREATED)


class InterimPaymentCertificateListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = InterimPaymentCertificate.objects.filter(organization=membership.organization).select_related("customer")

        status_param = request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        customer_id = request.query_params.get("customer_id")
        if customer_id:
            qs = qs.filter(customer__public_id=customer_id)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = InterimPaymentCertificateSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_manage_billing(membership):
            raise PermissionDenied("Only authorized staff can draft IPC records.")

        customer_id = request.data.get("customer_id")
        if not customer_id:
            raise ValidationError({"customer_id": "customer_id is required."})

        customer = get_scoped_customer(membership, customer_id)

        try:
            ipc = BillingService.create_ipc(
                organization=membership.organization,
                user=request.user,
                customer=customer,
                data=request.data,
            )
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))
        except KeyError as exc:
            raise ValidationError(f"Missing required field: {exc}")

        return Response(InterimPaymentCertificateSerializer(ipc).data, status=status.HTTP_201_CREATED)


class InterimPaymentCertificateActionView(APIView):
    def post(self, request, public_id, action):
        membership = resolve_membership(request)
        ipc = get_scoped_ipc(membership, public_id)

        version = request.data.get("version")
        if version is None:
            raise ValidationError({"version": "Current IPC version is required."})

        reason = request.data.get("reason", "")

        try:
            if action == "certify":
                qs_sign_off_by = request.data.get("qs_sign_off_by")
                if not qs_sign_off_by:
                    raise ValidationError({"qs_sign_off_by": "QS sign-off name is required."})
                updated = BillingService.certify_ipc(
                    organization=membership.organization,
                    user=request.user,
                    ipc=ipc,
                    qs_sign_off_by=qs_sign_off_by,
                    version=int(version),
                    reason=reason,
                )
            elif action == "approve":
                if not can_approve_commercial(membership):
                    raise PermissionDenied("Only commercial directors can approve IPCs.")
                updated = BillingService.approve_ipc(
                    organization=membership.organization,
                    user=request.user,
                    ipc=ipc,
                    version=int(version),
                    reason=reason,
                )
            else:
                raise ValidationError(f"Unknown IPC action '{action}'.")
        except ConflictError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))

        return Response(InterimPaymentCertificateSerializer(updated).data)
