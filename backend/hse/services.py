from datetime import timedelta

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError

from organizations.models import Membership

from .models import Credential, GasTest, HseAuditEvent, Mobilization, MobilizationWorker, Permit


class Conflict(APIException):
    status_code = 409
    default_detail = "The record conflicts with the current server state."
    default_code = "conflict"


APPROVER_ROLES = {Membership.Role.OWNER, Membership.Role.ADMIN}
WRITE_ROLES = APPROVER_ROLES | {Membership.Role.MEMBER}


def audit(*, target, actor, action, reason="", from_status="", to_status="", metadata=None):
    return HseAuditEvent.objects.create(
        organization=target.organization,
        actor=actor,
        target_type=target._meta.model_name,
        target_id=target.public_id,
        action=action,
        reason=reason,
        from_status=from_status,
        to_status=to_status,
        metadata=metadata or {},
    )


def credential_blocking_reasons(*, worker, procedure, on_date):
    if not procedure.is_approved:
        return ["The governing safety procedure has not been approved."]
    required_until = on_date + timedelta(days=procedure.credential_buffer_days)
    credentials = {
        item.kind: item
        for item in worker.credentials.filter(status=Credential.Status.VERIFIED)
        if item.expires_on >= required_until
    }
    labels = dict(Credential.Kind.choices)
    return [
        f"{labels.get(kind, kind)} must be verified through {required_until.isoformat()}."
        for kind in procedure.required_credential_kinds
        if kind not in credentials
    ]


@transaction.atomic
def assess_mobilization(*, mobilization, membership, version):
    if membership.role not in WRITE_ROLES:
        raise PermissionDenied("Your organization role cannot assess a mobilization.")
    locked = Mobilization.objects.select_for_update().select_related("procedure").get(pk=mobilization.pk)
    if locked.version != version:
        raise Conflict("This mobilization changed since it was loaded. Refresh and try again.")
    if locked.status not in {Mobilization.Status.DRAFT, Mobilization.Status.BLOCKED, Mobilization.Status.READY}:
        raise Conflict("This mobilization can no longer be reassessed.")
    crew = list(locked.crew_entries.select_related("worker"))
    if not crew:
        raise Conflict("Add at least one worker before assessing mobilization readiness.")
    scheduled_date = timezone.localtime(locked.scheduled_at).date()
    any_blocked = False
    for entry in crew:
        reasons = credential_blocking_reasons(worker=entry.worker, procedure=locked.procedure, on_date=scheduled_date)
        entry.is_cleared = not reasons
        entry.blocking_reasons = reasons
        entry.checked_at = timezone.now()
        entry.save(update_fields=("is_cleared", "blocking_reasons", "checked_at"))
        any_blocked |= bool(reasons)
    previous = locked.status
    locked.status = Mobilization.Status.BLOCKED if any_blocked else Mobilization.Status.READY
    locked.version = F("version") + 1
    locked.save(update_fields=("status", "version", "updated_at"))
    audit(target=locked, actor=membership.user, action="assess", from_status=previous, to_status=locked.status)
    locked.refresh_from_db()
    return locked


@transaction.atomic
def release_mobilization(*, mobilization, membership, version, reason):
    if membership.role not in APPROVER_ROLES:
        raise PermissionDenied("Only an owner or administrator can release a mobilization.")
    locked = Mobilization.objects.select_for_update().get(pk=mobilization.pk)
    if locked.version != version:
        raise Conflict("This mobilization changed since it was loaded. Refresh and try again.")
    if locked.status != Mobilization.Status.READY:
        raise Conflict("Only a fully cleared mobilization can be released.")
    if locked.crew_entries.filter(is_cleared=False).exists() or not locked.crew_entries.exists():
        raise Conflict("Every crew member must pass the readiness gate before release.")
    locked.status = Mobilization.Status.RELEASED
    locked.version = F("version") + 1
    locked.save(update_fields=("status", "version", "updated_at"))
    audit(target=locked, actor=membership.user, action="release", reason=reason, from_status=Mobilization.Status.READY, to_status=locked.status)
    locked.refresh_from_db()
    return locked


@transaction.atomic
def record_gas_test(*, permit, membership, data):
    if membership.role not in WRITE_ROLES:
        raise PermissionDenied("Your organization role cannot record gas tests.")
    locked = Permit.objects.select_for_update().select_related("procedure").get(pk=permit.pk)
    if locked.status not in {Permit.Status.DRAFT, Permit.Status.UNDER_REVIEW, Permit.Status.APPROVED, Permit.Status.ACTIVE}:
        raise Conflict("Gas tests cannot be added in this permit state.")
    procedure = locked.procedure
    if not procedure.is_approved:
        raise Conflict("An approved safety procedure is required before recording operational gas tests.")
    if data["instrument_calibration_expires_on"] < data["tested_at"].date():
        raise ValidationError({"instrument_calibration_expires_on": "The gas-test instrument calibration had expired."})
    passed = (
        procedure.oxygen_min_percent <= data["oxygen_percent"] <= procedure.oxygen_max_percent
        and data["lel_percent"] <= procedure.max_lel_percent
        and data["h2s_ppm"] <= procedure.max_h2s_ppm
    )
    reading = GasTest.objects.create(
        organization=locked.organization,
        permit=locked,
        recorded_by=membership.user,
        passed=passed,
        **data,
    )
    audit(target=locked, actor=membership.user, action="record_gas_test", metadata={"gas_test_id": str(reading.public_id), "passed": passed})
    return reading


@transaction.atomic
def transition_permit(*, permit, membership, action, version, reason):
    rules = {
        "submit": (Permit.Status.DRAFT, Permit.Status.UNDER_REVIEW, False),
        "approve": (Permit.Status.UNDER_REVIEW, Permit.Status.APPROVED, True),
        "activate": (Permit.Status.APPROVED, Permit.Status.ACTIVE, True),
        "suspend": (Permit.Status.ACTIVE, Permit.Status.SUSPENDED, True),
        "resume": (Permit.Status.SUSPENDED, Permit.Status.ACTIVE, True),
        "close": (Permit.Status.ACTIVE, Permit.Status.CLOSED, True),
        "reject": (Permit.Status.UNDER_REVIEW, Permit.Status.REJECTED, True),
        "cancel": (Permit.Status.DRAFT, Permit.Status.CANCELLED, False),
    }
    if action not in rules:
        raise ValidationError({"action": "Unsupported permit transition."})
    source, target, approval_required = rules[action]
    if membership.role not in WRITE_ROLES or (approval_required and membership.role not in APPROVER_ROLES):
        raise PermissionDenied("Your organization role cannot perform this permit action.")
    locked = Permit.objects.select_for_update().get(pk=permit.pk)
    if locked.version != version:
        raise Conflict("This permit changed since it was loaded. Refresh and try again.")
    if locked.status != source:
        raise Conflict(f"This action requires a permit in {source.replace('_', ' ')} status.")
    if action in {"approve", "activate"}:
        latest = locked.gas_tests.order_by("-tested_at").first()
        if not latest or not latest.passed:
            raise Conflict("A current passing gas test is required by this MVP safety gate.")
        if not locked.acknowledgements.filter(kind="jsa").exists():
            raise Conflict("At least one JSA acknowledgement is required.")
        if not locked.acknowledgements.filter(kind="toolbox").exists():
            raise Conflict("At least one toolbox-talk acknowledgement is required.")
    previous = locked.status
    locked.status = target
    locked.version = F("version") + 1
    if action == "approve":
        locked.approved_by = membership.user
        locked.approved_at = timezone.now()
    locked.save()
    audit(target=locked, actor=membership.user, action=action, reason=reason, from_status=previous, to_status=target)
    locked.refresh_from_db()
    return locked
