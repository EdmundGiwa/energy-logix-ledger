from django.urls import path

from .views import DemoAvailabilityView, DemoRequestCreateView

urlpatterns = [
    path("", DemoRequestCreateView.as_view(), name="demo-request-create"),
    path("availability/", DemoAvailabilityView.as_view(), name="demo-request-availability"),
]
