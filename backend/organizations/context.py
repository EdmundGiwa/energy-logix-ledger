from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from .models import Membership


def resolve_membership(request):
    memberships = Membership.objects.select_related("organization", "user").filter(
        user=request.user,
        is_active=True,
        organization__status="active",
    )
    organization_id = request.headers.get("X-Organization-ID")
    if organization_id:
        try:
            return memberships.get(organization__public_id=organization_id)
        except (Membership.DoesNotExist, ValueError):
            raise PermissionDenied("You do not have access to that organization.")

    count = memberships.count()
    if count == 0:
        raise NotFound("No active organization membership was found.")
    if count > 1:
        raise ValidationError({"organization": ["Select an organization using X-Organization-ID."]})
    return memberships.get()
