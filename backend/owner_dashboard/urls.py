from django.urls import path
from owner_dashboard.views import (
    ExecutiveExceptionAcknowledgeView,
    ExecutiveExceptionFeedView,
    ExecutiveExportJobDetailView,
    ExecutiveExportJobListCreateView,
    ExecutiveLiveKpisView,
)

app_name = "owner_dashboard"

urlpatterns = [
    path("kpis/", ExecutiveLiveKpisView.as_view(), name="live-kpis"),
    path("exceptions/", ExecutiveExceptionFeedView.as_view(), name="exception-feed"),
    path("exceptions/<uuid:public_id>/acknowledge/", ExecutiveExceptionAcknowledgeView.as_view(), name="exception-acknowledge"),
    path("exports/", ExecutiveExportJobListCreateView.as_view(), name="export-list-create"),
    path("exports/<uuid:public_id>/", ExecutiveExportJobDetailView.as_view(), name="export-detail"),
]
