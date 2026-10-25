from django.contrib import admin
from django.urls import include, path


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("core.urls")),
    path("api/v1/auth/", include("identity.urls")),
    path("api/v1/organizations/", include("organizations.urls")),
    path("api/v1/bunkerflow/", include("bunkering.urls")),
    path("api/v1/haultrac/", include("haulage.urls")),
    path("api/v1/safepass/", include("hse.urls")),
    path("api/v1/pipeintegrity/", include("pipeline_integrity.urls")),
    path("api/v1/refinerylink/", include("refinery_link.urls")),
    path("api/v1/marinestores/", include("marine_stores.urls")),
    path("api/v1/tankworks/", include("tank_works.urls")),
    path("api/v1/epclink/", include("epc_link.urls")),
    path("api/v1/compliance/", include("compliance_shield.urls")),
    path("api/v1/billing/", include("billing.urls")),
    path("api/v1/portal/", include("client_portal.urls")),
]
