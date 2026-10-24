from organizations.models import Membership


WRITE_ROLES = {Membership.Role.OWNER, Membership.Role.ADMIN, Membership.Role.MEMBER}
APPROVER_ROLES = {Membership.Role.OWNER, Membership.Role.ADMIN}


def can_write(membership):
    return membership.role in WRITE_ROLES


def can_approve(membership):
    return membership.role in APPROVER_ROLES
