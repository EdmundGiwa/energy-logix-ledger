from dataclasses import dataclass

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db import connection
from django.utils.text import slugify

from .models import Membership, Organization
from .db_context import set_tenant_actor


User = get_user_model()


@dataclass(frozen=True)
class RegistrationResult:
    user: User
    organization: Organization
    membership: Membership


def _available_slug(name: str) -> str:
    base = slugify(name)[:200] or "organization"
    candidate = base
    suffix = 2
    while Organization.objects.filter(slug=candidate).exists():
        candidate = f"{base[: 215 - len(str(suffix))]}-{suffix}"
        suffix += 1
    return candidate


@transaction.atomic
def register_organization_owner(*, first_name, last_name, email, password, organization_name, job_title, requested_plan):
    normalized_email = User.objects.normalize_email(email).strip().lower()
    user = User.objects.create_user(
        username=normalized_email,
        email=normalized_email,
        password=password,
        first_name=first_name.strip(),
        last_name=last_name.strip(),
    )
    organization = Organization.objects.create(
        name=organization_name.strip(),
        slug=_available_slug(organization_name),
        requested_plan=requested_plan,
    )
    set_tenant_actor(user_id=user.pk)
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT app_create_initial_owner_membership(%s, %s, %s)",
            (organization.pk, user.pk, job_title.strip()),
        )
        membership_id = cursor.fetchone()[0]
    membership = Membership.objects.get(pk=membership_id)
    return RegistrationResult(user=user, organization=organization, membership=membership)
