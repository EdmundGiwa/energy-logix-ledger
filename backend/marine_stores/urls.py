from django.urls import path

from marine_stores.views import (
    InventoryMovementListView,
    MarineCatalogueItemDetailView,
    MarineCatalogueItemListCreateView,
    MarineStoresSummaryView,
    RefrigerantCylinderDetailView,
    RefrigerantCylinderListCreateView,
    StoreInventoryItemListCreateView,
    StoreOrderDetailView,
    StoreOrderListCreateView,
    StoreOrderTransitionView,
)

app_name = "marine_stores"

urlpatterns = [
    path("summary/", MarineStoresSummaryView.as_view(), name="summary"),
    path("catalogue/", MarineCatalogueItemListCreateView.as_view(), name="catalogue-list-create"),
    path("catalogue/<uuid:public_id>/", MarineCatalogueItemDetailView.as_view(), name="catalogue-detail"),
    path("inventory/", StoreInventoryItemListCreateView.as_view(), name="inventory-list-create"),
    path("cylinders/", RefrigerantCylinderListCreateView.as_view(), name="cylinders-list-create"),
    path("cylinders/<uuid:public_id>/", RefrigerantCylinderDetailView.as_view(), name="cylinders-detail"),
    path("orders/", StoreOrderListCreateView.as_view(), name="orders-list-create"),
    path("orders/<uuid:public_id>/", StoreOrderDetailView.as_view(), name="orders-detail"),
    path("orders/<uuid:public_id>/actions/<str:action>/", StoreOrderTransitionView.as_view(), name="orders-transition"),
    path("movements/", InventoryMovementListView.as_view(), name="movements-list"),
]
