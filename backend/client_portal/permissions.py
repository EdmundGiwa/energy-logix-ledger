from organizations.models import Membership
from client_portal.models import ClientPortalProfile


def can_manage_client_portal(membership: Membership) -> bool:
    return membership.role in {Membership.Role.OWNER, Membership.Role.ADMIN}


def resolve_client_profile(user, organization):
    return ClientPortalProfile.objects.filter(user=user, organization=organization, is_active=True).first()
