from dataclasses import dataclass

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError

from .models import BunkerAuditEvent, BunkerDeliveryNote, Nomination, Sounding
from .permissions import can_approve, can_write
from core.request_context import current_request_id


class Conflict(APIException):
    status_code = 409
    default_detail = "The record conflicts with the current server state."
    default_code = "conflict"


@dataclass(frozen=True)
class TransitionRule:
    source: str
    target: str
    approval_required: bool = False


RULES = {
    "confirm": TransitionRule(Nomination.Status.DRAFT, Nomination.Status.CONFIRMED),
    "submit_review": TransitionRule(Nomination.Status.BDN_DRAFT, Nomination.Status.UNDER_REVIEW),
    "approve": TransitionRule(Nomination.Status.UNDER_REVIEW, Nomination.Status.APPROVED, True),
    "issue": TransitionRule(Nomination.Status.APPROVED, Nomination.Status.ISSUED, True),
}


def allowed_actions(nomination, membership):
    actions = ["export"] if nomination.status == Nomination.Status.ISSUED else []
    if not can_write(membership):
        return actions
    if nomination.status == Nomination.Status.DRAFT:
        actions += ["edit", "confirm", "cancel"]
    elif nomination.status == Nomination.Status.CONFIRMED:
        actions += ["record_sounding", "cancel"]
    elif nomination.status == Nomination.Status.SOUNDING_RECORDED:
        actions += ["record_sounding", "cancel"]
        if not nomination.soundings.filter(status=Sounding.Status.DRAFT).exists():
            actions.append("create_bdn")
    elif nomination.status == Nomination.Status.BDN_DRAFT:
        actions += ["edit_bdn", "submit_review", "cancel"]
    if can_approve(membership):
        if nomination.status == Nomination.Status.UNDER_REVIEW:
            actions.append("approve")
        elif nomination.status == Nomination.Status.APPROVED:
            actions.append("issue")
    return actions


def audit(*, nomination, actor, action, reason="", from_status="", to_status="", metadata=None):
    return BunkerAuditEvent.objects.create(
        organization=nomination.organization,
        request_id=current_request_id(),
        nomination=nomination,
        actor=actor,
        action=action,
        outcome=BunkerAuditEvent.Outcome.SUCCESS,
        reason=reason,
        from_status=from_status,
        to_status=to_status,
        metadata=metadata or {},
    )


def ensure_version(instance, version):
    if instance.version != version:
        raise Conflict("This record changed since it was loaded. Refresh and try again.")


@transaction.atomic
def transition_nomination(*, nomination, membership, action, version, reason):
    if action not in RULES:
        raise ValidationError({"action": "Unsupported workflow transition."})
    locked = Nomination.objects.select_for_update().get(pk=nomination.pk)
    ensure_version(locked, version)
    rule = RULES[action]
    if locked.status != rule.source:
        raise Conflict(f"Cannot {action.replace('_', ' ')} a nomination in {locked.get_status_display()} status.")
    if not can_write(membership) or (rule.approval_required and not can_approve(membership)):
        raise PermissionDenied("Your organization role cannot perform this action.")
    bdn = getattr(locked, "bdn", None)
    if action in {"approve", "issue"} and not bdn:
        raise Conflict("A BDN is required for this action.")
    now = timezone.now()
    if action == "approve":
        bdn.status = BunkerDeliveryNote.Status.APPROVED
        bdn.approved_by = membership.user
        bdn.approved_at = now
        bdn.version = F("version") + 1
        bdn.save(update_fields=("status", "approved_by", "approved_at", "version", "updated_at"))
    elif action == "issue":
        if not all((bdn.supplier_acknowledged_by, bdn.supplier_acknowledged_at, bdn.receiver_acknowledged_by, bdn.receiver_acknowledged_at)):
            raise Conflict("Supplier and receiver acknowledgements are required before issue.")
        bdn.status = BunkerDeliveryNote.Status.ISSUED
        bdn.issued_by = membership.user
        bdn.issued_at = now
        bdn.version = F("version") + 1
        bdn.save(update_fields=("status", "issued_by", "issued_at", "version", "updated_at"))
    elif action == "submit_review":
        if not all((bdn.supplier_acknowledged_by, bdn.supplier_acknowledged_at, bdn.receiver_acknowledged_by, bdn.receiver_acknowledged_at)):
            raise Conflict("Supplier and receiver acknowledgements are required before review.")
        bdn.status = BunkerDeliveryNote.Status.UNDER_REVIEW
        bdn.version = F("version") + 1
        bdn.save(update_fields=("status", "version", "updated_at"))
    previous = locked.status
    locked.status = rule.target
    locked.version = F("version") + 1
    locked.updated_by = membership.user
    locked.save(update_fields=("status", "version", "updated_by", "updated_at"))
    audit(nomination=locked, actor=membership.user, action=action, reason=reason, from_status=previous, to_status=rule.target)
    locked.refresh_from_db()
    return locked


@transaction.atomic
def cancel_nomination(*, nomination, membership, version, reason):
    locked = Nomination.objects.select_for_update().get(pk=nomination.pk)
    ensure_version(locked, version)
    if not can_write(membership):
        raise PermissionDenied("Your organization role cannot cancel this nomination.")
    if locked.status in {Nomination.Status.UNDER_REVIEW, Nomination.Status.APPROVED, Nomination.Status.ISSUED, Nomination.Status.CANCELLED}:
        raise Conflict("This nomination can no longer be cancelled.")
    previous = locked.status
    locked.status = Nomination.Status.CANCELLED
    locked.version = F("version") + 1
    locked.updated_by = membership.user
    locked.save(update_fields=("status", "version", "updated_by", "updated_at"))
    audit(nomination=locked, actor=membership.user, action="cancel", reason=reason, from_status=previous, to_status=locked.status)
    locked.refresh_from_db()
    return locked
