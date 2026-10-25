from django.urls import path

from compliance_shield.views import (
    AuditNonConformanceCloseView,
    AuditNonConformanceListCreateView,
    ComplianceEvidencePackListCreateView,
    ComplianceSummaryView,
    IsoManagementSystemAuditListCreateView,
    RegulatoryCertificateActionView,
    RegulatoryCertificateDetailView,
    RegulatoryCertificateListCreateView,
)

app_name = "compliance_shield"

urlpatterns = [
    path("summary/", ComplianceSummaryView.as_view(), name="summary"),
    path("certificates/", RegulatoryCertificateListCreateView.as_view(), name="certificates-list-create"),
    path("certificates/<uuid:public_id>/", RegulatoryCertificateDetailView.as_view(), name="certificates-detail"),
    path("certificates/<uuid:public_id>/actions/<str:action>/", RegulatoryCertificateActionView.as_view(), name="certificates-action"),
    path("iso-audits/", IsoManagementSystemAuditListCreateView.as_view(), name="iso-audits-list-create"),
    path("ncrs/", AuditNonConformanceListCreateView.as_view(), name="ncrs-list-create"),
    path("ncrs/<uuid:public_id>/close/", AuditNonConformanceCloseView.as_view(), name="ncrs-close"),
    path("evidence-packs/", ComplianceEvidencePackListCreateView.as_view(), name="evidence-packs-list-create"),
]
