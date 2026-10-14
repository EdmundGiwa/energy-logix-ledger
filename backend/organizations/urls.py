from django.urls import path

from .views import CurrentOrganizationMembersView


urlpatterns = [
    path("current/members/", CurrentOrganizationMembersView.as_view(), name="current-organization-members"),
]
