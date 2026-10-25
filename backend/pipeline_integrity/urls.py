from django.urls import path

from .views import (
    AssetIntegrityDossierView,
    AssetListCreateView,
    CPSurveyPointListCreateView,
    HydrotestDetailView,
    HydrotestListCreateView,
    HydrotestTransitionView,
    InspectionListCreateView,
    PigRunDetailView,
    PigRunListCreateView,
    PigRunTransitionView,
    ROWObservationListCreateView,
)


urlpatterns = [
    path("assets/", AssetListCreateView.as_view(), name="pipeline-asset-list"),
    path("assets/<uuid:public_id>/dossier/", AssetIntegrityDossierView.as_view(), name="pipeline-asset-dossier"),
    path("pig-runs/", PigRunListCreateView.as_view(), name="pipeline-pig-run-list"),
    path("pig-runs/<uuid:public_id>/", PigRunDetailView.as_view(), name="pipeline-pig-run-detail"),
    path("pig-runs/<uuid:public_id>/actions/<str:action>/", PigRunTransitionView.as_view(), name="pipeline-pig-run-transition"),
    path("hydrotests/", HydrotestListCreateView.as_view(), name="pipeline-hydrotest-list"),
    path("hydrotests/<uuid:public_id>/", HydrotestDetailView.as_view(), name="pipeline-hydrotest-detail"),
    path("hydrotests/<uuid:public_id>/actions/<str:action>/", HydrotestTransitionView.as_view(), name="pipeline-hydrotest-transition"),
    path("inspections/", InspectionListCreateView.as_view(), name="pipeline-inspection-list"),
    path("cp-survey-points/", CPSurveyPointListCreateView.as_view(), name="pipeline-cp-survey-point-list"),
    path("row-observations/", ROWObservationListCreateView.as_view(), name="pipeline-row-observation-list"),
]
