from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from refinery_link.models import (
    BatchQualityCertificate,
    DepotTank,
    GantryMeterTicket,
    OfftakeAppointment,
    RefineryAuditEvent,
    TankGaugeDip,
    Terminal,
)


ALLOWED_APPOINTMENT_TRANSITIONS = {
    OfftakeAppointment.Status.SCHEDULED: {
        "check_in": OfftakeAppointment.Status.CHECKED_IN,
        "cancel": OfftakeAppointment.Status.CANCELLED,
    },
    OfftakeAppointment.Status.CHECKED_IN: {
        "call_up": OfftakeAppointment.Status.CALLED_UP,
        "cancel": OfftakeAppointment.Status.CANCELLED,
    },
    OfftakeAppointment.Status.CALLED_UP: {
        "start_loading": OfftakeAppointment.Status.LOADING,
        "cancel": OfftakeAppointment.Status.CANCELLED,
    },
    OfftakeAppointment.Status.LOADING: {
        "complete": OfftakeAppointment.Status.COMPLETED,
        "cancel": OfftakeAppointment.Status.CANCELLED,
    },
}


class ConflictError(Exception):
    pass


class RefineryService:
    @staticmethod
    @transaction.atomic
    def create_appointment(*, organization, user, terminal, data):
        if terminal.organization_id != organization.id:
            raise ValidationError("Terminal does not belong to organization.")

        reference = data.get("reference")
        if not reference:
            count = OfftakeAppointment.objects.filter(organization=organization).count() + 1
            reference = f"APPT-{timezone.now().strftime('%Y%m')}-{count:04d}"

        appointment = OfftakeAppointment.objects.create(
            organization=organization,
            terminal=terminal,
            reference=reference,
            truck_plate=data["truck_plate"],
            driver_name=data["driver_name"],
            driver_phone=data.get("driver_phone", ""),
            driver_license=data.get("driver_license", ""),
            product_type=data["product_type"],
            nominated_volume_litres=Decimal(str(data["nominated_volume_litres"])),
            holding_park_slot=data.get("holding_park_slot", ""),
            rfid_tag=data.get("rfid_tag", ""),
            e_callup_reference=data.get("e_callup_reference", ""),
            scheduled_at=data.get("scheduled_at") or timezone.now(),
            notes=data.get("notes", ""),
            created_by=user,
            updated_by=user,
        )

        RefineryAuditEvent.objects.create(
            organization=organization,
            actor=user,
            action="create_appointment",
            target_type="appointment",
            target_id=appointment.public_id,
            from_status="",
            to_status=appointment.status,
            reason=f"Appointment {appointment.reference} created",
            metadata={"truck_plate": appointment.truck_plate, "product": appointment.product_type},
        )
        return appointment

    @staticmethod
    @transaction.atomic
    def transition_appointment(*, organization, user, appointment, action, version, reason=""):
        if appointment.organization_id != organization.id:
            raise ValidationError("Appointment does not belong to organization.")

        if appointment.version != version:
            raise ConflictError(f"Stale appointment version. Expected {appointment.version}, got {version}.")

        allowed = ALLOWED_APPOINTMENT_TRANSITIONS.get(appointment.status, {})
        next_status = allowed.get(action)
        if not next_status:
            raise ValidationError(f"Cannot perform action '{action}' on appointment in '{appointment.status}' state.")

        from_status = appointment.status
        now = timezone.now()
        appointment.status = next_status
        appointment.version += 1
        appointment.updated_by = user

        if next_status == OfftakeAppointment.Status.CHECKED_IN and not appointment.checked_in_at:
            appointment.checked_in_at = now
        elif next_status == OfftakeAppointment.Status.CALLED_UP and not appointment.called_up_at:
            appointment.called_up_at = now
        elif next_status == OfftakeAppointment.Status.COMPLETED and not appointment.completed_at:
            appointment.completed_at = now

        appointment.save()

        RefineryAuditEvent.objects.create(
            organization=organization,
            actor=user,
            action=action,
            target_type="appointment",
            target_id=appointment.public_id,
            from_status=from_status,
            to_status=next_status,
            reason=reason or f"Transitioned to {next_status}",
            metadata={"action": action, "version": appointment.version},
        )
        return appointment

    @staticmethod
    @transaction.atomic
    def record_tank_dip(*, organization, user, tank, data):
        if tank.organization_id != organization.id:
            raise ValidationError("Depot tank does not belong to organization.")

        reference = data.get("reference")
        if not reference:
            count = TankGaugeDip.objects.filter(organization=organization).count() + 1
            reference = f"DIP-{timezone.now().strftime('%Y%m')}-{count:04d}"

        gov = Decimal(str(data["gross_observed_volume_litres"]))
        nsv = Decimal(str(data.get("net_standard_volume_litres", gov)))

        dip = TankGaugeDip.objects.create(
            organization=organization,
            tank=tank,
            reference=reference,
            dip_type=data.get("dip_type", TankGaugeDip.DipType.MANUAL),
            observed_level_mm=Decimal(str(data["observed_level_mm"])),
            water_cut_mm=Decimal(str(data.get("water_cut_mm", "0.00"))),
            temperature_c=Decimal(str(data["temperature_c"])),
            observed_density_kg_m3=Decimal(str(data["observed_density_kg_m3"])),
            gross_observed_volume_litres=gov,
            net_standard_volume_litres=nsv,
            recorded_at=data.get("recorded_at") or timezone.now(),
            operator_name=data["operator_name"],
            notes=data.get("notes", ""),
            created_by=user,
        )

        RefineryAuditEvent.objects.create(
            organization=organization,
            actor=user,
            action="record_tank_dip",
            target_type="tank_dip",
            target_id=dip.public_id,
            from_status="",
            to_status=dip.dip_type,
            reason=f"Dip recorded on tank {tank.tank_number}",
            metadata={"observed_level_mm": str(dip.observed_level_mm), "nsv_litres": str(dip.net_standard_volume_litres)},
        )
        return dip

    @staticmethod
    @transaction.atomic
    def issue_meter_ticket(*, organization, user, appointment, tank, data):
        if appointment.organization_id != organization.id:
            raise ValidationError("Appointment does not belong to organization.")
        if tank.organization_id != organization.id:
            raise ValidationError("Tank does not belong to organization.")

        ticket_number = data.get("ticket_number")
        if not ticket_number:
            count = GantryMeterTicket.objects.filter(organization=organization).count() + 1
            ticket_number = f"GTR-{timezone.now().strftime('%Y%m')}-{count:04d}"

        gross_vol = Decimal(str(data["gross_volume_litres"]))
        net_vol = Decimal(str(data["net_volume_litres"]))
        start_reading = Decimal(str(data["batch_start_reading"]))
        end_reading = Decimal(str(data["batch_end_reading"]))

        # Calculate reconciliation variance vs appointment nominated volume
        nominated = appointment.nominated_volume_litres
        variance_litres = net_vol - nominated
        variance_percent = (variance_litres / nominated) * Decimal("100.0") if nominated else Decimal("0.0")

        # Tolerable variance is +/- 0.5% in standard depot custody transfer
        status = GantryMeterTicket.Status.RECONCILED if abs(variance_percent) <= Decimal("0.5") else GantryMeterTicket.Status.FLAGGED_VARIANCE

        ticket = GantryMeterTicket.objects.create(
            organization=organization,
            appointment=appointment,
            tank=tank,
            ticket_number=ticket_number,
            meter_id=data["meter_id"],
            batch_start_reading=start_reading,
            batch_end_reading=end_reading,
            gross_volume_litres=gross_vol,
            net_volume_litres=net_vol,
            temperature_c=Decimal(str(data["temperature_c"])),
            density_at_15c=Decimal(str(data["density_at_15c"])),
            variance_litres=variance_litres,
            variance_percent=variance_percent,
            status=status,
            started_at=data.get("started_at") or timezone.now(),
            completed_at=data.get("completed_at") or timezone.now(),
            created_by=user,
        )

        RefineryAuditEvent.objects.create(
            organization=organization,
            actor=user,
            action="issue_meter_ticket",
            target_type="meter_ticket",
            target_id=ticket.public_id,
            from_status="",
            to_status=ticket.status,
            reason=f"Gantry meter ticket {ticket.ticket_number} reconciled ({status})",
            metadata={"variance_percent": str(variance_percent), "meter_id": ticket.meter_id},
        )
        return ticket

    @staticmethod
    @transaction.atomic
    def record_quality_certificate(*, organization, user, data):
        cert_number = data.get("certificate_number")
        if not cert_number:
            count = BatchQualityCertificate.objects.filter(organization=organization).count() + 1
            cert_number = f"QC-{data['product_type'].upper()}-{timezone.now().strftime('%Y%m')}-{count:04d}"

        density = Decimal(str(data["density_at_15c"]))
        sulphur = Decimal(str(data["sulphur_ppm"]))
        flash = Decimal(str(data["flash_point_c"])) if data.get("flash_point_c") is not None else None
        ron = Decimal(str(data["ron"])) if data.get("ron") is not None else None
        distillation = Decimal(str(data["distillation_recovery_percent"])) if data.get("distillation_recovery_percent") is not None else None

        # Basic NMDPRA compliance validation: AGO sulphur <= 50 ppm, Flash >= 60C; PMS RON >= 90
        is_compliant = True
        if data["product_type"] == DepotTank.ProductType.AGO:
            if sulphur > Decimal("50.0") or (flash is not None and flash < Decimal("60.0")):
                is_compliant = False
        elif data["product_type"] == DepotTank.ProductType.PMS:
            if ron is not None and ron < Decimal("90.0"):
                is_compliant = False

        if "is_compliant_nmdpra" in data:
            is_compliant = bool(data["is_compliant_nmdpra"])

        cert = BatchQualityCertificate.objects.create(
            organization=organization,
            certificate_number=cert_number,
            product_type=data["product_type"],
            batch_number=data["batch_number"],
            density_at_15c=density,
            flash_point_c=flash,
            ron=ron,
            distillation_recovery_percent=distillation,
            sulphur_ppm=sulphur,
            is_compliant_nmdpra=is_compliant,
            laboratory_name=data["laboratory_name"],
            tested_at=data.get("tested_at") or timezone.now(),
            authorized_chemist=data["authorized_chemist"],
            notes=data.get("notes", ""),
            created_by=user,
        )

        RefineryAuditEvent.objects.create(
            organization=organization,
            actor=user,
            action="record_quality_certificate",
            target_type="quality_cert",
            target_id=cert.public_id,
            from_status="",
            to_status="compliant" if is_compliant else "non_compliant",
            reason=f"Quality certificate {cert.certificate_number} recorded",
            metadata={"batch_number": cert.batch_number, "sulphur_ppm": str(cert.sulphur_ppm)},
        )
        return cert
