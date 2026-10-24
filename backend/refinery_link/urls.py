from django.urls import path

from refinery_link.views import (
    BatchQualityCertificateListCreateView,
    DepotTankListCreateView,
    GantryMeterTicketListCreateView,
    OfftakeAppointmentDetailView,
    OfftakeAppointmentListCreateView,
    OfftakeAppointmentTransitionView,
    RefinerySummaryView,
    TankGaugeDipListCreateView,
    TerminalListCreateView,
)

urlpatterns = [
    path("summary/", RefinerySummaryView.as_view(), name="refinery-summary"),
    path("terminals/", TerminalListCreateView.as_view(), name="refinery-terminal-list"),
    path("tanks/", DepotTankListCreateView.as_view(), name="refinery-tank-list"),
    path("appointments/", OfftakeAppointmentListCreateView.as_view(), name="refinery-appointment-list"),
    path("appointments/<uuid:public_id>/", OfftakeAppointmentDetailView.as_view(), name="refinery-appointment-detail"),
    path("appointments/<uuid:public_id>/actions/<str:action>/", OfftakeAppointmentTransitionView.as_view(), name="refinery-appointment-transition"),
    path("tank-dips/", TankGaugeDipListCreateView.as_view(), name="refinery-dip-list"),
    path("meter-tickets/", GantryMeterTicketListCreateView.as_view(), name="refinery-ticket-list"),
    path("quality-certs/", BatchQualityCertificateListCreateView.as_view(), name="refinery-qc-list"),
]
