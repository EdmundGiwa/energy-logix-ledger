from django.urls import path

from billing.views import (
    BillingSummaryView,
    CommercialInvoiceActionView,
    CommercialInvoiceDetailView,
    CommercialInvoiceListCreateView,
    CustomerAccountDetailView,
    CustomerAccountListCreateView,
    CustomerStatementView,
    InterimPaymentCertificateActionView,
    InterimPaymentCertificateListCreateView,
    PaymentReceiptListCreateView,
)

app_name = "billing"

urlpatterns = [
    path("summary/", BillingSummaryView.as_view(), name="summary"),
    path("customers/", CustomerAccountListCreateView.as_view(), name="customers-list-create"),
    path("customers/<uuid:public_id>/", CustomerAccountDetailView.as_view(), name="customers-detail"),
    path("customers/<uuid:public_id>/statement/", CustomerStatementView.as_view(), name="customers-statement"),
    path("invoices/", CommercialInvoiceListCreateView.as_view(), name="invoices-list-create"),
    path("invoices/<uuid:public_id>/", CommercialInvoiceDetailView.as_view(), name="invoices-detail"),
    path("invoices/<uuid:public_id>/actions/<str:action>/", CommercialInvoiceActionView.as_view(), name="invoices-action"),
    path("payments/", PaymentReceiptListCreateView.as_view(), name="payments-list-create"),
    path("ipcs/", InterimPaymentCertificateListCreateView.as_view(), name="ipcs-list-create"),
    path("ipcs/<uuid:public_id>/actions/<str:action>/", InterimPaymentCertificateActionView.as_view(), name="ipcs-action"),
]
