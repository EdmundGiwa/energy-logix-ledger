from django.urls import path

from .views import (
    CustomerListCreateView, DeliveryExportView, DispatchDetailView, DispatchListCreateView,
    DispatchTransitionView, DriverListCreateView, FleetDetailView, FleetListCreateView, FleetStageView, HaulageSummaryView, LocationListCreateView,
    ProofOfDeliveryCreateView, TrailerListCreateView, TruckListCreateView, WaybillCreateView,
    WaybillQRView, WaybillVerifyView, WeighbridgeReadingCreateView,
)


urlpatterns = [
    path("summary/", HaulageSummaryView.as_view(), name="haul-summary"),
    path("fleets/", FleetListCreateView.as_view(), name="haul-fleet-list"),
    path("fleets/<uuid:public_id>/", FleetDetailView.as_view(), name="haul-fleet-detail"),
    path("fleets/<uuid:public_id>/stage/", FleetStageView.as_view(), name="haul-fleet-stage"),
    path("customers/", CustomerListCreateView.as_view(), name="haul-customer-list"),
    path("locations/", LocationListCreateView.as_view(), name="haul-location-list"),
    path("trucks/", TruckListCreateView.as_view(), name="haul-truck-list"),
    path("trailers/", TrailerListCreateView.as_view(), name="haul-trailer-list"),
    path("drivers/", DriverListCreateView.as_view(), name="haul-driver-list"),
    path("dispatches/", DispatchListCreateView.as_view(), name="haul-dispatch-list"),
    path("dispatches/<uuid:public_id>/", DispatchDetailView.as_view(), name="haul-dispatch-detail"),
    path("dispatches/<uuid:public_id>/actions/<str:action>/", DispatchTransitionView.as_view(), name="haul-dispatch-transition"),
    path("dispatches/<uuid:public_id>/weighbridge/", WeighbridgeReadingCreateView.as_view(), name="haul-weighbridge-create"),
    path("dispatches/<uuid:public_id>/waybill/", WaybillCreateView.as_view(), name="haul-waybill-create"),
    path("dispatches/<uuid:public_id>/waybill/qr/", WaybillQRView.as_view(), name="haul-waybill-qr"),
    path("dispatches/<uuid:public_id>/waybill/verify/<uuid:code>/", WaybillVerifyView.as_view(), name="haul-waybill-verify"),
    path("dispatches/<uuid:public_id>/proof-of-delivery/", ProofOfDeliveryCreateView.as_view(), name="haul-pod-create"),
    path("dispatches/<uuid:public_id>/export/", DeliveryExportView.as_view(), name="haul-delivery-export"),
]
