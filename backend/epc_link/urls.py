from django.urls import path

from epc_link.views import (
    ApprovedVendorDetailView,
    ApprovedVendorListCreateView,
    EpcLinkSummaryView,
    MaterialIssueSlipListCreateView,
    MaterialRequisitionDetailView,
    MaterialRequisitionListCreateView,
    MaterialRequisitionTransitionView,
    NigerianContentReportView,
    PipeYardItemDetailView,
    PipeYardItemListCreateView,
)

app_name = "epc_link"

urlpatterns = [
    path("summary/", EpcLinkSummaryView.as_view(), name="summary"),
    path("vendors/", ApprovedVendorListCreateView.as_view(), name="vendors-list-create"),
    path("vendors/<uuid:public_id>/", ApprovedVendorDetailView.as_view(), name="vendors-detail"),
    path("requisitions/", MaterialRequisitionListCreateView.as_view(), name="requisitions-list-create"),
    path("requisitions/<uuid:public_id>/", MaterialRequisitionDetailView.as_view(), name="requisitions-detail"),
    path("requisitions/<uuid:public_id>/actions/<str:action>/", MaterialRequisitionTransitionView.as_view(), name="requisitions-transition"),
    path("yard-items/", PipeYardItemListCreateView.as_view(), name="yard-items-list-create"),
    path("yard-items/<uuid:public_id>/", PipeYardItemDetailView.as_view(), name="yard-items-detail"),
    path("issue-slips/", MaterialIssueSlipListCreateView.as_view(), name="issue-slips-list-create"),
    path("nigerian-content-report/", NigerianContentReportView.as_view(), name="nigerian-content-report"),
]
