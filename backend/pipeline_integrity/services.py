from dataclasses import dataclass

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError

from core.request_context import current_request_id

from .models import Hydrotest, PigRun, PipelineAuditEvent
from .permissions import can_write


class Conflict(APIException):
    status_code = 409
    default_detail = "The record conflicts with the current server state."
    default_code = "conflict"


@dataclass(frozen=True)
class TransitionRule:
    source: str
    target: str


PIG_RULES = {
    "launch": TransitionRule(PigRun.Status.DRAFT, PigRun.Status.LAUNCHED),
    "start_transit": TransitionRule(PigRun.Status.LAUNCHED, PigRun.Status.IN_TRANSIT),
    "arrive": TransitionRule(PigRun.Status.IN_TRANSIT, PigRun.Status.ARRIVED),
    "recover": TransitionRule(PigRun.Status.ARRIVED, PigRun.Status.RECOVERED),
}
HYDRO_RULES = {
    "start": TransitionRule(Hydrotest.Status.DRAFT, Hydrotest.Status.IN_PROGRESS),
    "pass": TransitionRule(Hydrotest.Status.IN_PROGRESS, Hydrotest.Status.PASSED),
    "fail": TransitionRule(Hydrotest.Status.IN_PROGRESS, Hydrotest.Status.FAILED),
}


def audit(*, organization, actor, action, asset=None, pig_run=None, hydrotest=None, reason="", from_status="", to_status="", metadata=None):
    return PipelineAuditEvent.objects.create(
        organization=organization,
        asset=asset,
        pig_run=pig_run,
        hydrotest=hydrotest,
        actor=actor,
        action=action,
        reason=reason,
        from_status=from_status,
        to_status=to_status,
        metadata=metadata or {},
    )


def ensure_version(instance, version):
    if instance.version != version:
        raise Conflict("This record changed since it was loaded. Refresh and try again.")


def pig_allowed_actions(pig_run, membership):
    if not can_write(membership):
        return []
    return [action for action, rule in PIG_RULES.items() if pig_run.status == rule.source]


def hydro_allowed_actions(hydrotest, membership):
    if not can_write(membership):
        return []
    return [action for action, rule in HYDRO_RULES.items() if hydrotest.status == rule.source]


@transaction.atomic
def transition_pig(*, pig_run, membership, action, version, reason, updates=None):
    if not can_write(membership):
        raise PermissionDenied("Your organization role cannot update pig runs.")
    rule = PIG_RULES.get(action)
    if not rule:
        raise ValidationError({"action": "Unsupported pig-run transition."})
    locked = PigRun.objects.select_for_update().select_related("asset").get(pk=pig_run.pk)
    ensure_version(locked, version)
    if locked.status != rule.source:
        raise Conflict(f"Cannot {action.replace('_', ' ')} a pig run in {locked.get_status_display()} status.")
    now = timezone.now()
    field_updates = {"status": rule.target, "version": F("version") + 1, "updated_by": membership.user, "updated_at": now}
    if action == "launch": field_updates["launched_at"] = now
    if action == "arrive": field_updates["arrived_at"] = now
    if action == "recover": field_updates["recovered_at"] = now
    for field, value in (updates or {}).items():
        if field in {"transit_velocity_mps", "debris_volume_m3", "notes"}:
            setattr(locked, field, value)
            field_updates[field] = value
    previous = locked.status
    for field, value in field_updates.items(): setattr(locked, field, value)
    locked.save(update_fields=tuple(field_updates))
    audit(organization=locked.organization, actor=membership.user, action=action, asset=locked.asset, pig_run=locked, reason=reason, from_status=previous, to_status=rule.target)
    locked.refresh_from_db()
    return locked


@transaction.atomic
def transition_hydrotest(*, hydrotest, membership, action, version, reason, updates=None):
    if not can_write(membership):
        raise PermissionDenied("Your organization role cannot update hydrotests.")
    rule = HYDRO_RULES.get(action)
    if not rule:
        raise ValidationError({"action": "Unsupported hydrotest transition."})
    locked = Hydrotest.objects.select_for_update().select_related("asset").get(pk=hydrotest.pk)
    ensure_version(locked, version)
    if locked.status != rule.source:
        raise Conflict(f"Cannot {action} a hydrotest in {locked.get_status_display()} status.")
    if action in {"pass", "fail"} and not locked.pressure_drop_bar and locked.pressure_drop_bar != 0:
        raise ValidationError({"pressure_drop_bar": "Record the observed pressure drop before completing the test."})
    now = timezone.now()
    previous = locked.status
    locked.status = rule.target
    locked.started_at = locked.started_at or (now if action == "start" else None)
    if action in {"pass", "fail"}: locked.completed_at = now
    locked.version = F("version") + 1
    locked.updated_by = membership.user
    if updates:
        for field, value in updates.items():
            if field in {"pressure_drop_bar", "minimum_temperature_c", "maximum_temperature_c", "acceptance_note"}:
                setattr(locked, field, value)
    locked.save()
    audit(organization=locked.organization, actor=membership.user, action=action, asset=locked.asset, hydrotest=locked, reason=reason, from_status=previous, to_status=rule.target)
    locked.refresh_from_db()
    return locked
