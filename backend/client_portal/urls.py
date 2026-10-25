from django.urls import path
from client_portal.views import (
    ClientPortalAuditLogView,
    ClientPortalFeedView,
    ClientPortalProfileDetailView,
    ClientPortalProfileListCreateView,
    ClientPortalSummaryView,
    SharedDeliverablePackageDetailView,
    SharedDeliverablePackageListCreateView,
    SharedDeliverablePackageVerifyView,
)

app_name = "client_portal"

urlpatterns = [
    path("summary/", ClientPortalSummaryView.as_view(), name="portal-summary"),
    path("feed/", ClientPortalFeedView.as_view(), name="portal-feed"),
    path("packages/", SharedDeliverablePackageListCreateView.as_view(), name="package-list-create"),
    path("packages/<uuid:public_id>/", SharedDeliverablePackageDetailView.as_view(), name="package-detail"),
    path("packages/<uuid:public_id>/verify/", SharedDeliverablePackageVerifyView.as_view(), name="package-verify"),
    path("profiles/", ClientPortalProfileListCreateView.as_view(), name="profile-list-create"),
    path("profiles/<uuid:public_id>/", ClientPortalProfileDetailView.as_view(), name="profile-detail"),
    path("audit-logs/", ClientPortalAuditLogView.as_view(), name="audit-logs"),
]
