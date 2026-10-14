from rest_framework.permissions import BasePermission

from .context import resolve_membership


class HasActiveOrganizationMembership(BasePermission):
    def has_permission(self, request, view):
        request.membership = resolve_membership(request)
        request.organization = request.membership.organization
        return True
