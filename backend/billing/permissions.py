from organizations.models import Membership


def can_manage_billing(membership: Membership) -> bool:
    return membership.role in {Membership.Role.OWNER, Membership.Role.ADMIN, Membership.Role.MEMBER}


def can_approve_commercial(membership: Membership) -> bool:
    return membership.role in {Membership.Role.OWNER, Membership.Role.ADMIN}
