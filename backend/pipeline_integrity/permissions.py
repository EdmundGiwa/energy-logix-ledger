from organizations.models import Membership


WRITE_ROLES = {Membership.Role.OWNER, Membership.Role.ADMIN, Membership.Role.MEMBER}


def can_write(membership):
    return membership.role in WRITE_ROLES
