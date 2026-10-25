from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from tank_works.models import (
    CoatingInspection,
    CrewEquipmentUtilization,
    SludgeWasteManifest,
    TankFieldJob,
    TankWorksAuditEvent,
)


ALLOWED_JOB_TRANSITIONS = {
    TankFieldJob.Status.DRAFT: {
        "submit_permit": TankFieldJob.Status.PERMIT_PENDING,
        "cancel": TankFieldJob.Status.CANCELLED,
    },
    TankFieldJob.Status.PERMIT_PENDING: {
        "activate": TankFieldJob.Status.ACTIVE,
        "cancel": TankFieldJob.Status.CANCELLED,
    },
    TankFieldJob.Status.ACTIVE: {
        "commence_inspection": TankFieldJob.Status.INSPECTION,
        "cancel": TankFieldJob.Status.CANCELLED,
    },
    TankFieldJob.Status.INSPECTION: {
        "complete": TankFieldJob.Status.COMPLETED,
        "reopen_active": TankFieldJob.Status.ACTIVE,
        "cancel": TankFieldJob.Status.CANCELLED,
    },
}


class ConflictError(Exception):
    pass


class TankWorksService:
    @staticmethod
    def audit(*, organization, job, actor, action, from_status="", to_status="", reason="", metadata=None):
        return TankWorksAuditEvent.objects.create(
            organization=organization,
            job=job,
            actor=actor,
            action=action,
            from_status=from_status,
            to_status=to_status,
            reason=reason,
            metadata=metadata or {},
        )

    @staticmethod
    @transaction.atomic
    def create_job(*, organization, user, data):
        count = TankFieldJob.objects.filter(organization=organization).count() + 1
        job_number = data.get("job_number") or f"TW-{timezone.now().strftime('%Y%m')}-{count:04d}"

        job = TankFieldJob.objects.create(
            organization=organization,
            job_number=job_number,
            client_name=data["client_name"],
            terminal_or_facility=data["terminal_or_facility"],
            tank_identifier=data["tank_identifier"],
            tank_capacity_m3=Decimal(str(data["tank_capacity_m3"])) if data.get("tank_capacity_m3") else None,
            scope_of_work=data["scope_of_work"],
            estimated_cost_minor=int(data.get("estimated_cost_minor", 0)),
            currency=data.get("currency", "NGN"),
            safepass_permit_ref=data.get("safepass_permit_ref", ""),
            notes=data.get("notes", ""),
            created_by=user,
            updated_by=user,
        )

        TankWorksService.audit(
            organization=organization,
            job=job,
            actor=user,
            action="create_job",
            to_status=job.status,
            reason="Job scope and estimate created",
        )
        return job

    @staticmethod
    @transaction.atomic
    def transition_job(*, organization, user, job, action, version, reason="", permit_data=None):
        if job.organization_id != organization.id:
            raise ValidationError("Job does not belong to organization.")

        if job.version != version:
            raise ConflictError(f"Stale job version. Expected {job.version}, got {version}.")

        allowed = ALLOWED_JOB_TRANSITIONS.get(job.status, {})
        next_status = allowed.get(action)
        if not next_status:
            raise ValidationError(f"Cannot perform action '{action}' on job in '{job.status}' state.")

        # Safety Interlock: Active field operations require gas test clearance
        if next_status == TankFieldJob.Status.ACTIVE:
            if permit_data:
                job.safepass_permit_ref = permit_data.get("safepass_permit_ref", job.safepass_permit_ref)
                job.gas_test_cleared = permit_data.get("gas_test_cleared", job.gas_test_cleared)

            if not job.safepass_permit_ref or not job.gas_test_cleared:
                raise ValidationError("Confined-space entry requires an active SafePass permit reference and verified gas test clearance.")
            
            if not job.started_at:
                job.started_at = timezone.now()

        elif next_status == TankFieldJob.Status.COMPLETED:
            job.completed_at = timezone.now()

        from_status = job.status
        job.status = next_status
        job.version += 1
        job.updated_by = user
        job.save()

        TankWorksService.audit(
            organization=organization,
            job=job,
            actor=user,
            action=action,
            from_status=from_status,
            to_status=next_status,
            reason=reason or f"Transitioned job to {next_status}",
        )
        return job

    @staticmethod
    @transaction.atomic
    def record_waste_manifest(*, organization, user, job, data):
        if job.organization_id != organization.id:
            raise ValidationError("Job does not belong to organization.")

        count = SludgeWasteManifest.objects.filter(organization=organization).count() + 1
        manifest_number = data.get("manifest_number") or f"SWM-{timezone.now().strftime('%Y%m')}-{count:04d}"

        manifest = SludgeWasteManifest.objects.create(
            organization=organization,
            job=job,
            manifest_number=manifest_number,
            waste_classification=data["waste_classification"],
            quantity=Decimal(str(data["quantity"])),
            unit_of_measure=data.get("unit_of_measure", "metric_tonnes"),
            transporter_name=data["transporter_name"],
            vehicle_registration=data["vehicle_registration"],
            driver_name=data["driver_name"],
            nesrea_permit_number=data.get("nesrea_permit_number", ""),
            disposal_facility=data["disposal_facility"],
            treatment_method=data.get("treatment_method", "Bioremediation & Thermal Desorption"),
            is_consignment_signed=data.get("is_consignment_signed", True),
            notes=data.get("notes", ""),
        )

        TankWorksService.audit(
            organization=organization,
            job=job,
            actor=user,
            action="record_waste_manifest",
            reason=f"Waste manifest {manifest.manifest_number} generated for {manifest.quantity} {manifest.unit_of_measure}",
            metadata={"manifest_id": str(manifest.public_id), "waste_class": manifest.waste_classification},
        )
        return manifest

    @staticmethod
    @transaction.atomic
    def record_coating_inspection(*, organization, user, job, data):
        if job.organization_id != organization.id:
            raise ValidationError("Job does not belong to organization.")

        min_dft = int(data["measured_min_dft_microns"])
        avg_dft = int(data["measured_avg_dft_microns"])
        max_dft = int(data["measured_max_dft_microns"])
        specified_dft = int(data["specified_dft_microns"])

        dft_passed = min_dft >= int(specified_dft * 0.8) and avg_dft >= specified_dft

        inspection = CoatingInspection.objects.create(
            organization=organization,
            job=job,
            surface_location=data["surface_location"],
            blast_standard=data.get("blast_standard", "SSPC-SP 10 / NACE No. 2"),
            surface_profile_microns=Decimal(str(data["surface_profile_microns"])),
            coating_system=data["coating_system"],
            specified_dft_microns=specified_dft,
            measured_min_dft_microns=min_dft,
            measured_avg_dft_microns=avg_dft,
            measured_max_dft_microns=max_dft,
            dft_passed=dft_passed,
            adhesion_test_method=data.get("adhesion_test_method", "ASTM D4541 Dolly Pull-off"),
            adhesion_result_mpa=Decimal(str(data["adhesion_result_mpa"])) if data.get("adhesion_result_mpa") else None,
            ambient_temp_c=Decimal(str(data["ambient_temp_c"])) if data.get("ambient_temp_c") else None,
            steel_temp_c=Decimal(str(data["steel_temp_c"])) if data.get("steel_temp_c") else None,
            relative_humidity_percent=Decimal(str(data["relative_humidity_percent"])) if data.get("relative_humidity_percent") else None,
            dew_point_c=Decimal(str(data["dew_point_c"])) if data.get("dew_point_c") else None,
            inspector_name=data["inspector_name"],
            nace_level=data.get("nace_level", "NACE / AMPP Level 2 Certified"),
            inspection_date=data.get("inspection_date") or timezone.now().date(),
            passed=dft_passed and (data.get("passed", True)),
            notes=data.get("notes", ""),
        )

        TankWorksService.audit(
            organization=organization,
            job=job,
            actor=user,
            action="record_coating_inspection",
            reason=f"Coating QA/QC inspection logged for {inspection.surface_location} ({'PASSED' if inspection.passed else 'FAILED'})",
            metadata={"inspection_id": str(inspection.public_id), "passed": inspection.passed},
        )
        return inspection

    @staticmethod
    @transaction.atomic
    def log_utilization(*, organization, user, job, data):
        if job.organization_id != organization.id:
            raise ValidationError("Job does not belong to organization.")

        log = CrewEquipmentUtilization.objects.create(
            organization=organization,
            job=job,
            entry_date=data["entry_date"],
            personnel_role=data["personnel_role"],
            headcount=int(data.get("headcount", 1)),
            man_hours=Decimal(str(data["man_hours"])),
            equipment_description=data["equipment_description"],
            equipment_hours=Decimal(str(data.get("equipment_hours", "0.00"))),
            consumables_used=data.get("consumables_used", ""),
        )
        return log
