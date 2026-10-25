from organizations.models import Membership


WRITE_ROLES = {Membership.Role.OWNER, Membership.Role.ADMIN, Membership.Role.MEMBER}
APPROVE_ROLES = {Membership.Role.OWNER, Membership.Role.ADMIN}


def can_write(membership):
    return membership.role in WRITE_ROLES


def can_approve(membership):
    return membership.role in APPROVE_ROLES
