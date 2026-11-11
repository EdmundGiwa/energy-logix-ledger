from django.urls import path

from .views import CurrentOrganizationMembersView, ModuleAccessRequestsView


urlpatterns = [
    path("current/members/", CurrentOrganizationMembersView.as_view(), name="current-organization-members"),
    path("current/module-requests/", ModuleAccessRequestsView.as_view(), name="current-organization-module-requests"),
]
