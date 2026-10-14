from dataclasses import dataclass

from django.db import transaction
from django.db.models import F
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError

from core.request_context import current_request_id

from .models import (
    Customer, DeliveryLocation, Dispatch, Driver, Fleet, FleetAuditEvent,
    HaulageAuditEvent, Trailer, Truck,
)
from .permissions import can_close, can_write


class Conflict(APIException):
    status_code = 409
    default_detail = "The record conflicts with the current server state."
    default_code = "conflict"


@dataclass(frozen=True)
class TransitionRule:
    source: str
    target: str
    close_permission: bool = False


RULES = {
    "dispatch": TransitionRule(Dispatch.Status.DRAFT, Dispatch.Status.DISPATCHED),
    "start_trip": TransitionRule(Dispatch.Status.DISPATCHED, Dispatch.Status.IN_TRANSIT),
    "arrive": TransitionRule(Dispatch.Status.IN_TRANSIT, Dispatch.Status.ARRIVED),
    "start_discharge": TransitionRule(Dispatch.Status.ARRIVED, Dispatch.Status.DISCHARGING),
    "close": TransitionRule(Dispatch.Status.DELIVERED, Dispatch.Status.CLOSED, True),
}


def ensure_version(instance, version):
    if instance.version != version:
        raise Conflict("This dispatch changed since it was loaded. Refresh and try again.")


def ensure_fleet_version(instance, version):
    if instance.version != version:
        raise Conflict("This fleet draft changed since it was loaded. Refresh and try again.")


@transaction.atomic
def save_fleet_stage(*, fleet, membership, stage, data, version):
    locked = Fleet.objects.select_for_update().get(pk=fleet.pk)
    ensure_fleet_version(locked, version)
    if locked.status != Fleet.Status.DRAFT:
        raise Conflict("A completed fleet cannot be changed.")
    if stage != locked.next_step:
        raise Conflict(f"Complete the {locked.next_step} stage next.")

    organization = membership.organization
    if stage == "customer":
        record, _ = Customer.objects.get_or_create(
            organization=organization,
            name=data["name"],
            defaults={"contact_name": data.get("contact_name", ""), "contact_phone": data.get("contact_phone", "")},
        )
        locked.customer = record
    elif stage == "route":
        origin_data = data["origin"]
        destination_data = data["destination"]
        if origin_data["name"].casefold() == destination_data["name"].casefold():
            raise ValidationError({"destination.name": "Destination must differ from origin."})
        origin, _ = DeliveryLocation.objects.get_or_create(
            organization=organization,
            name=origin_data["name"],
            defaults={
                "address": origin_data.get("address", ""), "contact_name": origin_data.get("contact_name", ""),
                "contact_phone": origin_data.get("contact_phone", ""),
            },
        )
        destination, _ = DeliveryLocation.objects.get_or_create(
            organization=organization,
            name=destination_data["name"],
            defaults={
                "address": destination_data.get("address", ""), "contact_name": destination_data.get("contact_name", ""),
                "contact_phone": destination_data.get("contact_phone", ""),
            },
        )
        if origin.pk == destination.pk:
            raise ValidationError({"destination.name": "Destination must differ from origin."})
        locked.origin = origin
        locked.destination = destination
    elif stage == "truck":
        record, _ = Truck.objects.get_or_create(
            organization=organization,
            registration_number=data["registration_number"],
            defaults={
                "fleet_number": data.get("fleet_number", ""), "make_model": data.get("make_model", ""),
                "capacity_litres": data["capacity_litres"],
            },
        )
        locked.truck = record
    elif stage == "trailer":
        record, _ = Trailer.objects.get_or_create(
            organization=organization,
            registration_number=data["registration_number"],
            defaults={
                "fleet_number": data.get("fleet_number", ""), "capacity_litres": data["capacity_litres"],
                "calibration_expires_on": data.get("calibration_expires_on"),
            },
        )
        locked.trailer = record
    elif stage == "driver":
        record, _ = Driver.objects.get_or_create(
            organization=organization,
            licence_number=data["licence_number"],
            defaults={
                "full_name": data["full_name"], "phone_number": data["phone_number"],
                "licence_expires_on": data["licence_expires_on"],
            },
        )
        locked.driver = record
    else:
        raise ValidationError({"stage": "Unsupported fleet setup stage."})

    locked.version += 1
    locked.updated_by = membership.user
    if locked.next_step == "complete":
        locked.status = Fleet.Status.READY
    locked.full_clean()
    locked.save()
    FleetAuditEvent.objects.create(
        organization=organization, fleet=locked, actor=membership.user,
        action="complete_fleet" if locked.status == Fleet.Status.READY else "save_stage",
        stage=stage, metadata={"version": locked.version},
    )
    return locked


def audit(*, dispatch, actor, action, reason="", from_status="", to_status="", metadata=None):
    return HaulageAuditEvent.objects.create(
        organization=dispatch.organization,
        request_id=current_request_id(),
        dispatch=dispatch,
        actor=actor,
        action=action,
        reason=reason,
        from_status=from_status,
        to_status=to_status,
        metadata=metadata or {},
    )


def allowed_actions(dispatch, membership):
    actions = ["export"] if dispatch.status == Dispatch.Status.CLOSED else []
    if not can_write(membership):
        return actions
    if dispatch.status == Dispatch.Status.DRAFT:
        actions += ["edit", "record_weighbridge", "cancel"]
        kinds = set(dispatch.weighbridge_readings.values_list("kind", flat=True))
        if {"tare", "gross"}.issubset(kinds):
            if not hasattr(dispatch, "waybill"):
                actions.append("generate_waybill")
            else:
                actions.append("dispatch")
    elif dispatch.status == Dispatch.Status.DISPATCHED:
        actions.append("start_trip")
    elif dispatch.status == Dispatch.Status.IN_TRANSIT:
        actions.append("arrive")
    elif dispatch.status == Dispatch.Status.ARRIVED:
        actions.append("start_discharge")
    elif dispatch.status == Dispatch.Status.DISCHARGING:
        actions.append("record_pod")
    elif dispatch.status == Dispatch.Status.DELIVERED and can_close(membership):
        actions.append("close")
    return actions


def validate_dispatch_ready(dispatch):
    readings = {reading.kind: reading for reading in dispatch.weighbridge_readings.all()}
    if set(readings) != {"tare", "gross"}:
        raise Conflict("Tare and gross readings are required before dispatch.")
    if readings["gross"].weight_kg <= readings["tare"].weight_kg:
        raise Conflict("Gross weight must be greater than tare weight.")
    if not hasattr(dispatch, "waybill"):
        raise Conflict("Generate the e-Waybill before dispatch.")


@transaction.atomic
def transition_dispatch(*, dispatch, membership, action, version, reason):
    if action not in RULES:
        raise ValidationError({"action": "Unsupported workflow transition."})
    locked = Dispatch.objects.select_for_update().get(pk=dispatch.pk)
    ensure_version(locked, version)
    rule = RULES[action]
    if locked.status != rule.source:
        raise Conflict(f"Cannot {action.replace('_', ' ')} a trip in {locked.get_status_display()} status.")
    if not can_write(membership) or (rule.close_permission and not can_close(membership)):
        raise PermissionDenied("Your organization role cannot perform this action.")
    if action == "dispatch":
        validate_dispatch_ready(locked)
    if action == "close" and not hasattr(locked, "proof_of_delivery"):
        raise Conflict("Proof of delivery is required before closure.")
    previous = locked.status
    locked.status = rule.target
    locked.version = F("version") + 1
    locked.updated_by = membership.user
    locked.save(update_fields=("status", "version", "updated_by", "updated_at"))
    audit(dispatch=locked, actor=membership.user, action=action, reason=reason, from_status=previous, to_status=rule.target)
    locked.refresh_from_db()
    return locked


@transaction.atomic
def cancel_dispatch(*, dispatch, membership, version, reason):
    locked = Dispatch.objects.select_for_update().get(pk=dispatch.pk)
    ensure_version(locked, version)
    if not can_write(membership):
        raise PermissionDenied("Your organization role cannot cancel this dispatch.")
    if locked.status != Dispatch.Status.DRAFT:
        raise Conflict("Only a draft dispatch can be cancelled.")
    previous = locked.status
    locked.status = Dispatch.Status.CANCELLED
    locked.version = F("version") + 1
    locked.updated_by = membership.user
    locked.save(update_fields=("status", "version", "updated_by", "updated_at"))
    audit(dispatch=locked, actor=membership.user, action="cancel", reason=reason, from_status=previous, to_status=locked.status)
    locked.refresh_from_db()
    return locked
