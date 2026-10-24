from django.urls import path
from .views import CredentialListCreateView, CredentialVerifyView, MobilizationAssessView, MobilizationCrewView, MobilizationDetailView, MobilizationListCreateView, MobilizationReleaseView, PermitAcknowledgementView, PermitDetailView, PermitExportView, PermitGasTestView, PermitListCreateView, PermitTransitionView, ProcedureApproveView, ProcedureListCreateView, SummaryView, WorkerListCreateView

urlpatterns = [
    path("summary/", SummaryView.as_view(), name="hse-summary"),
    path("workers/", WorkerListCreateView.as_view(), name="hse-worker-list"),
    path("credentials/", CredentialListCreateView.as_view(), name="hse-credential-list"),
    path("credentials/<uuid:public_id>/verify/", CredentialVerifyView.as_view(), name="hse-credential-verify"),
    path("procedures/", ProcedureListCreateView.as_view(), name="hse-procedure-list"),
    path("procedures/<uuid:public_id>/approve/", ProcedureApproveView.as_view(), name="hse-procedure-approve"),
    path("mobilizations/", MobilizationListCreateView.as_view(), name="hse-mobilization-list"),
    path("mobilizations/<uuid:public_id>/", MobilizationDetailView.as_view(), name="hse-mobilization-detail"),
    path("mobilizations/<uuid:public_id>/crew/", MobilizationCrewView.as_view(), name="hse-mobilization-crew"),
    path("mobilizations/<uuid:public_id>/assess/", MobilizationAssessView.as_view(), name="hse-mobilization-assess"),
    path("mobilizations/<uuid:public_id>/release/", MobilizationReleaseView.as_view(), name="hse-mobilization-release"),
    path("permits/", PermitListCreateView.as_view(), name="hse-permit-list"),
    path("permits/<uuid:public_id>/", PermitDetailView.as_view(), name="hse-permit-detail"),
    path("permits/<uuid:public_id>/gas-tests/", PermitGasTestView.as_view(), name="hse-permit-gas-test"),
    path("permits/<uuid:public_id>/acknowledgements/", PermitAcknowledgementView.as_view(), name="hse-permit-ack"),
    path("permits/<uuid:public_id>/actions/<str:action>/", PermitTransitionView.as_view(), name="hse-permit-transition"),
    path("permits/<uuid:public_id>/export/", PermitExportView.as_view(), name="hse-permit-export"),
]
