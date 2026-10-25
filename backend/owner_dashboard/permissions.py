from organizations.models import Membership


def can_view_owner_dashboard(membership: Membership) -> bool:
    return membership.role in {Membership.Role.OWNER, Membership.Role.ADMIN, Membership.Role.MEMBER, Membership.Role.VIEWER}


def can_manage_owner_exceptions(membership: Membership) -> bool:
    return membership.role in {Membership.Role.OWNER, Membership.Role.ADMIN}


def can_request_executive_exports(membership: Membership) -> bool:
    return membership.role in {Membership.Role.OWNER, Membership.Role.ADMIN}
