"""Organization business rules: provisioning, module entitlements and access requests.

Admin actions and API views must call these functions; they are the only code paths
that create customer organizations or change which modules a customer can use.
"""

import logging
from dataclasses import dataclass
from html import escape

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError, connection, transaction
from django.utils import timezone
from django.utils.text import slugify
from rest_framework.exceptions import PermissionDenied, ValidationError

from .db_context import set_tenant_actor
from .models import Membership, ModuleAccessRequest, ModuleEntitlementEvent, Organization, OrganizationModule
from .modules import CORE_MODULES, MODULES

logger = logging.getLogger("offshora.organizations")
User = get_user_model()

REQUEST_ROLES = {Membership.Role.OWNER, Membership.Role.ADMIN}


def _require_platform_admin(actor):
    if not (actor and actor.is_active and actor.is_superuser):
        raise PermissionDenied("Only Offshora platform administrators can change customer accounts.")


def _available_slug(name: str) -> str:
    base = slugify(name)[:200] or "organization"
    candidate = base
    suffix = 2
    while Organization.objects.filter(slug=candidate).exists():
        candidate = f"{base[: 215 - len(str(suffix))]}-{suffix}"
        suffix += 1
    return candidate


# ── Entitlements ────────────────────────────────────────────────────────────


def enabled_modules(organization) -> frozenset:
    """Core modules plus every module switched on for this organization."""
    return CORE_MODULES | frozenset(organization.module_entitlements.values_list("module", flat=True))


@transaction.atomic
def set_organization_modules(*, organization, modules, actor, reason: str = "") -> frozenset:
    """Make the organization's optional modules exactly ``modules`` and record each change.

    Core modules are always on and cannot be switched off. Open access requests for
    newly enabled modules are marked approved.
    """
    _require_platform_admin(actor)
    unknown = sorted(set(modules) - set(MODULES))
    if unknown:
        raise ValidationError({"modules": [f"Unknown module(s): {', '.join(unknown)}."]})
    desired = set(modules) - CORE_MODULES
    current = set(organization.module_entitlements.values_list("module", flat=True))
    reason = reason[:300]

    for module in sorted(desired - current):
        OrganizationModule.objects.create(organization=organization, module=module, enabled_by=actor)
        ModuleEntitlementEvent.objects.create(
            organization=organization, module=module, action=ModuleEntitlementEvent.Action.ENABLED, actor=actor, reason=reason
        )
    for module in sorted(current - desired):
        OrganizationModule.objects.filter(organization=organization, module=module).delete()
        ModuleEntitlementEvent.objects.create(
            organization=organization, module=module, action=ModuleEntitlementEvent.Action.DISABLED, actor=actor, reason=reason
        )

    ModuleAccessRequest.objects.filter(
        organization=organization, module__in=desired, status=ModuleAccessRequest.Status.OPEN
    ).update(status=ModuleAccessRequest.Status.APPROVED, resolved_by=actor, resolved_at=timezone.now())
    return enabled_modules(organization)


# ── Access requests ─────────────────────────────────────────────────────────


@dataclass(frozen=True)
class AccessRequestResult:
    access_request: ModuleAccessRequest
    created: bool


def request_module_access(*, membership, module: str, message: str = "") -> AccessRequestResult:
    """An owner or admin asks Offshora to switch on a module. Repeats return the open request."""
    if membership.role not in REQUEST_ROLES:
        raise PermissionDenied("Ask an owner or administrator of your organization to request new modules.")
    if module not in MODULES:
        raise ValidationError({"module": ["Unknown module."]})
    organization = membership.organization
    if module in enabled_modules(organization):
        raise ValidationError({"module": [f"{MODULES[module]} is already switched on for your organization."]})

    existing = ModuleAccessRequest.objects.filter(
        organization=organization, module=module, status=ModuleAccessRequest.Status.OPEN
    ).first()
    if existing:
        return AccessRequestResult(existing, created=False)
    try:
        with transaction.atomic():
            access_request = ModuleAccessRequest.objects.create(
                organization=organization, module=module, requested_by=membership.user, message=message.strip()[:500]
            )
    except IntegrityError:
        # A concurrent request for the same module won the race; return it.
        return AccessRequestResult(
            ModuleAccessRequest.objects.get(organization=organization, module=module, status=ModuleAccessRequest.Status.OPEN),
            created=False,
        )
    transaction.on_commit(lambda: _notify_sales_of_request(access_request))
    return AccessRequestResult(access_request, created=True)


@transaction.atomic
def resolve_module_request(*, access_request: ModuleAccessRequest, approve: bool, actor) -> ModuleAccessRequest:
    _require_platform_admin(actor)
    locked = ModuleAccessRequest.objects.select_for_update().select_related("organization").get(pk=access_request.pk)
    if locked.status != ModuleAccessRequest.Status.OPEN:
        return locked
    if approve:
        current = set(locked.organization.module_entitlements.values_list("module", flat=True))
        set_organization_modules(
            organization=locked.organization,
            modules=current | {locked.module},
            actor=actor,
            reason=f"Approved customer request {locked.public_id}",
        )
        locked.refresh_from_db()
    else:
        locked.status = ModuleAccessRequest.Status.DECLINED
        locked.resolved_by = actor
        locked.resolved_at = timezone.now()
        locked.save(update_fields=["status", "resolved_by", "resolved_at"])
    return locked


def _notify_sales_of_request(access_request: ModuleAccessRequest) -> None:
    from core.email import render_base_email, send_transactional_email

    recipients = list(getattr(settings, "SALES_NOTIFY_EMAILS", []))
    if not recipients:
        logger.warning("No SALES_NOTIFY_EMAILS configured; module request %s not emailed.", access_request.public_id)
        return
    org = access_request.organization
    module = MODULES[access_request.module]
    requester = access_request.requested_by
    who = (requester.get_full_name() or requester.email) if requester else "A customer"
    body = f"""
      <h1 style="margin:0 0 16px;font-size:21px;font-weight:700;color:#0f172a;">{escape(org.name)} wants {escape(module)}</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:#475569;">{escape(who)} requested access from the dashboard.</p>
      <p style="margin:0;font-size:14px;line-height:22px;color:#475569;">{escape(access_request.message) or "No message."}</p>
    """
    send_transactional_email(
        to=recipients,
        subject=f"Module request · {org.name} · {module}",
        html_content=render_base_email(
            title="Module access request",
            preheader=escape(f"{org.name} requested {module}"),
            body_html=body,
            recipient_email=escape(", ".join(recipients)),
        ),
        reply_to=requester.email if requester else "",
        organization=org,
        email_type="module_access_request",
        metadata={"request": str(access_request.public_id)},
    )


# ── Provisioning ────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class ProvisionResult:
    organization: Organization
    owner: User


@transaction.atomic
def provision_customer(
    *,
    actor,
    organization_name: str,
    owner_email: str,
    owner_first_name: str,
    owner_last_name: str,
    owner_job_title: str,
    plan: str,
    modules,
    demo_request=None,
) -> ProvisionResult:
    """Create a customer organization, its owner and module entitlements, then invite the owner.

    The owner gets no password: the invite email carries a one-time link to set one.
    """
    _require_platform_admin(actor)
    email = User.objects.normalize_email(owner_email).strip().lower()
    if User.objects.filter(email__iexact=email).exists():
        raise ValidationError({"owner_email": ["A user with this email already exists. Add them to the organization instead."]})
    if plan not in Organization.Plan.values:
        raise ValidationError({"plan": ["Unknown plan."]})

    if demo_request is not None:
        from demo_requests.models import DemoRequest

        demo_request = DemoRequest.objects.select_for_update().get(pk=demo_request.pk)
        if demo_request.converted_organization_id:
            raise ValidationError({"demo_request": ["This booking has already been turned into a customer account."]})

    owner = User.objects.create_user(
        username=email,
        email=email,
        password=None,  # unusable until the invite is accepted
        first_name=owner_first_name.strip(),
        last_name=owner_last_name.strip(),
    )
    organization = Organization.objects.create(
        name=organization_name.strip(), slug=_available_slug(organization_name), requested_plan=plan
    )

    # Row-level security only lets the new owner create the first membership of an
    # empty organization, through the audited database function used since day one.
    set_tenant_actor(user_id=owner.pk)
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT app_create_initial_owner_membership(%s, %s, %s)",
            (organization.pk, owner.pk, owner_job_title.strip()[:120]),
        )
    set_tenant_actor(user_id=actor.pk)

    set_organization_modules(
        organization=organization,
        modules=modules,
        actor=actor,
        reason=f"Provisioned from demo {demo_request.reference}" if demo_request else "Provisioned by Offshora",
    )

    if demo_request is not None:
        demo_request.converted_organization = organization
        demo_request.converted_at = timezone.now()
        demo_request.save(update_fields=["converted_organization", "converted_at", "updated_at"])

    def _invite():
        from identity.services import send_account_invite

        send_account_invite(user=owner, organization=organization, invited_by=actor)

    transaction.on_commit(_invite)
    return ProvisionResult(organization=organization, owner=owner)
