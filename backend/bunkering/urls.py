from django.urls import path

from .views import (
    BDNExportView,
    BDNView,
    BunkerDashboardView,
    NominationDetailView,
    NominationListCreateView,
    NominationTransitionView,
    SoundingCreateView,
    SoundingReviewView,
)


urlpatterns = [
    path("summary/", BunkerDashboardView.as_view(), name="bunker-summary"),
    path("nominations/", NominationListCreateView.as_view(), name="bunker-nomination-list"),
    path("nominations/<uuid:public_id>/", NominationDetailView.as_view(), name="bunker-nomination-detail"),
    path("nominations/<uuid:public_id>/actions/<str:action>/", NominationTransitionView.as_view(), name="bunker-nomination-transition"),
    path("nominations/<uuid:public_id>/soundings/", SoundingCreateView.as_view(), name="bunker-sounding-create"),
    path("nominations/<uuid:public_id>/soundings/review/", SoundingReviewView.as_view(), name="bunker-sounding-review"),
    path("nominations/<uuid:public_id>/bdn/", BDNView.as_view(), name="bunker-bdn"),
    path("nominations/<uuid:public_id>/bdn/export/", BDNExportView.as_view(), name="bunker-bdn-export"),
]
