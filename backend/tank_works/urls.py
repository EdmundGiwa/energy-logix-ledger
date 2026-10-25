from django.urls import path

from tank_works.views import (
    CoatingInspectionListCreateView,
    CrewEquipmentUtilizationListCreateView,
    SludgeWasteManifestListCreateView,
    TankFieldJobDetailView,
    TankFieldJobListCreateView,
    TankFieldJobTransitionView,
    TankWorksSummaryView,
)

app_name = "tank_works"

urlpatterns = [
    path("summary/", TankWorksSummaryView.as_view(), name="summary"),
    path("jobs/", TankFieldJobListCreateView.as_view(), name="jobs-list-create"),
    path("jobs/<uuid:public_id>/", TankFieldJobDetailView.as_view(), name="jobs-detail"),
    path("jobs/<uuid:public_id>/actions/<str:action>/", TankFieldJobTransitionView.as_view(), name="jobs-transition"),
    path("manifests/", SludgeWasteManifestListCreateView.as_view(), name="manifests-list-create"),
    path("inspections/", CoatingInspectionListCreateView.as_view(), name="inspections-list-create"),
    path("utilization/", CrewEquipmentUtilizationListCreateView.as_view(), name="utilization-list-create"),
]
