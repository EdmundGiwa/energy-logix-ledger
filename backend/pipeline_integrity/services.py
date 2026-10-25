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
    if updates:
        for field, value in updates.items():
            if field in {"pressure_drop_bar", "minimum_temperature_c", "maximum_temperature_c", "acceptance_note"}:
                setattr(locked, field, value)
    if action in {"pass", "fail"} and locked.pressure_drop_bar is None:
        raise ValidationError({"pressure_drop_bar": "Record the observed pressure drop before completing the test."})
    now = timezone.now()
    previous = locked.status
    locked.status = rule.target
    locked.started_at = locked.started_at or (now if action == "start" else None)
    if action in {"pass", "fail"}: locked.completed_at = now
    locked.version = F("version") + 1
    locked.updated_by = membership.user
    locked.save()
    audit(organization=locked.organization, actor=membership.user, action=action, asset=locked.asset, hydrotest=locked, reason=reason, from_status=previous, to_status=rule.target)
    locked.refresh_from_db()
    return locked


def build_asset_integrity_dossier(*, asset, organization):
    """
    Assembles a comprehensive, verifiable asset-integrity dossier for regulatory
    and IOC compliance audit (NUPRC / Chevron / Shell / TotalEnergies).
    Computes engineering metrics: remaining wall life, NACE CP compliance,
    and normalized hydrotest hold verification.
    """
    if asset.organization_id != organization.id:
        raise PermissionDenied("Asset does not belong to organization.")

    # 1. Hydrotest analysis
    tests = asset.hydrotests.filter(organization=organization).order_by("-completed_at")
    passed_tests = tests.filter(status=Hydrotest.Status.PASSED)
    latest_hydro = passed_tests.first()

    # 2. Pig runs analysis
    pig_runs = asset.pig_runs.filter(organization=organization).order_by("-created_at")
    completed_pigs = pig_runs.filter(status=PigRun.Status.RECOVERED)
    latest_pig = completed_pigs.first() or pig_runs.first()

    # 3. NDT and corrosion analysis
    inspections = asset.inspections.filter(organization=organization).order_by("-created_at")
    min_remaining_life = None
    min_wall_thickness = None
    max_corrosion_rate = None
    rejected_inspections = inspections.filter(result="rejected").count()
    review_inspections = inspections.filter(result="requires_review").count()

    for insp in inspections:
        if insp.remaining_life_years is not None:
            if min_remaining_life is None or insp.remaining_life_years < min_remaining_life:
                min_remaining_life = insp.remaining_life_years
        if insp.measured_wall_thickness_mm is not None:
            if min_wall_thickness is None or insp.measured_wall_thickness_mm < min_wall_thickness:
                min_wall_thickness = insp.measured_wall_thickness_mm
        if insp.corrosion_rate_mm_per_year is not None:
            if max_corrosion_rate is None or insp.corrosion_rate_mm_per_year > max_corrosion_rate:
                max_corrosion_rate = insp.corrosion_rate_mm_per_year

    # 4. Cathodic Protection compliance (NACE SP0169: -850 mV to -1200 mV CSE)
    cp_points = asset.cp_survey_points.filter(organization=organization)
    total_cp = cp_points.count()
    compliant_cp = 0
    for cp in cp_points:
        # standard potential between -1200 and -850 mV CSE
        if -1200 <= cp.potential_mv <= -850:
            compliant_cp += 1
    cp_compliance_rate = round((compliant_cp / total_cp * 100), 1) if total_cp > 0 else 100.0

    # 5. Right-of-Way (ROW) observations
    row_obs = asset.row_observations.filter(organization=organization)
    open_row = row_obs.exclude(status="closed")
    critical_row = open_row.filter(severity__in=["high", "critical"]).count()

    # 6. Overall Integrity Index calculation
    score = 100.0
    if not latest_hydro:
        score -= 20.0
    if rejected_inspections > 0:
        score -= (rejected_inspections * 15.0)
    if min_remaining_life is not None and min_remaining_life < 5.0:
        score -= 15.0
    if cp_compliance_rate < 90.0:
        score -= 10.0
    if critical_row > 0:
        score -= (critical_row * 10.0)
    integrity_score = max(0.0, min(100.0, score))

    return {
        "asset": {
            "id": str(asset.public_id),
            "reference": asset.reference,
            "name": asset.name,
            "fluid_type": asset.fluid_type,
            "governing_code": asset.governing_code,
            "is_active": asset.is_active,
        },
        "integrity_summary": {
            "integrity_score": round(integrity_score, 1),
            "status": "satisfactory" if integrity_score >= 80 else "requires_action" if integrity_score >= 60 else "critical",
            "governing_standards": [asset.governing_code, "NACE SP0169", "API 1163", "ASME B31G"],
            "latest_hydrotest_passed": latest_hydro.reference if latest_hydro else None,
            "hydrotest_pressure_bar": str(latest_hydro.test_pressure_bar) if latest_hydro else None,
            "hydrotest_hold_minutes": latest_hydro.hold_duration_minutes if latest_hydro else None,
            "min_remaining_life_years": str(min_remaining_life) if min_remaining_life is not None else "N/A",
            "max_corrosion_rate_mm_yr": str(max_corrosion_rate) if max_corrosion_rate is not None else "N/A",
            "cp_compliance_percent": cp_compliance_rate,
            "total_cp_survey_points": total_cp,
            "open_row_anomalies": open_row.count(),
            "critical_row_anomalies": critical_row,
        },
        "pig_operations": {
            "total_runs": pig_runs.count(),
            "completed_runs": completed_pigs.count(),
            "latest_run_reference": latest_pig.reference if latest_pig else None,
            "latest_pig_type": latest_pig.pig_type if latest_pig else None,
            "latest_status": latest_pig.status if latest_pig else None,
        },
        "records": {
            "inspections_count": inspections.count(),
            "rejected_inspections": rejected_inspections,
            "hydrotests_count": tests.count(),
            "cp_points_count": total_cp,
            "row_observations_count": row_obs.count(),
        },
    }

