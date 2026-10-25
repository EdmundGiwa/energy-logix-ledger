from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from organizations.context import resolve_membership
from tank_works.models import (
    CoatingInspection,
    CrewEquipmentUtilization,
    SludgeWasteManifest,
    TankFieldJob,
)
from tank_works.permissions import can_approve, can_write
from tank_works.serializers import (
    CoatingInspectionSerializer,
    CrewEquipmentUtilizationSerializer,
    SludgeWasteManifestSerializer,
    TankFieldJobSerializer,
)
from tank_works.services import ConflictError, TankWorksService


class StandardPagination(PageNumberPagination):
    page_size = 20
    max_page_size = 100
    page_size_query_param = "page_size"


def get_scoped_job(membership, public_id):
    try:
        return TankFieldJob.objects.prefetch_related(
            "waste_manifests", "coating_inspections", "audit_events__actor"
        ).get(organization=membership.organization, public_id=public_id)
    except TankFieldJob.DoesNotExist:
        raise NotFound("TankWorks job not found.")


class TankFieldJobListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = TankFieldJob.objects.filter(organization=membership.organization).prefetch_related(
            "waste_manifests", "coating_inspections", "audit_events"
        )

        status_param = request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        scope = request.query_params.get("scope")
        if scope:
            qs = qs.filter(scope_of_work=scope)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(job_number__icontains=search)
                | Q(client_name__icontains=search)
                | Q(tank_identifier__icontains=search)
                | Q(terminal_or_facility__icontains=search)
            )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = TankFieldJobSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized staff can create tank field jobs.")

        try:
            job = TankWorksService.create_job(
                organization=membership.organization,
                user=request.user,
                data=request.data,
            )
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))
        except KeyError as exc:
            raise ValidationError(f"Missing required field: {exc}")

        return Response(TankFieldJobSerializer(job).data, status=status.HTTP_201_CREATED)


class TankFieldJobDetailView(APIView):
    def get(self, request, public_id):
        membership = resolve_membership(request)
        job = get_scoped_job(membership, public_id)
        return Response(TankFieldJobSerializer(job).data)

    def patch(self, request, public_id):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized staff can edit tank jobs.")

        job = get_scoped_job(membership, public_id)
        serializer = TankFieldJobSerializer(job, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save(updated_by=request.user)
        return Response(TankFieldJobSerializer(updated).data)


class TankFieldJobTransitionView(APIView):
    def post(self, request, public_id, action):
        membership = resolve_membership(request)
        job = get_scoped_job(membership, public_id)

        version = request.data.get("version")
        if version is None:
            raise ValidationError({"version": "Current job version is required."})

        reason = request.data.get("reason", "")
        permit_data = request.data.get("permit_data")

        try:
            updated = TankWorksService.transition_job(
                organization=membership.organization,
                user=request.user,
                job=job,
                action=action,
                version=int(version),
                reason=reason,
                permit_data=permit_data,
            )
        except ConflictError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))

        return Response(TankFieldJobSerializer(updated).data)


class SludgeWasteManifestListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = SludgeWasteManifest.objects.filter(organization=membership.organization).select_related("job")

        job_id = request.query_params.get("job_id")
        if job_id:
            qs = qs.filter(job__public_id=job_id)

        waste_class = request.query_params.get("waste_classification")
        if waste_class:
            qs = qs.filter(waste_classification=waste_class)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = SludgeWasteManifestSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized staff can record waste manifests.")

        job_id = request.data.get("job_id")
        if not job_id:
            raise ValidationError({"job_id": "job_id is required."})

        job = get_scoped_job(membership, job_id)

        try:
            manifest = TankWorksService.record_waste_manifest(
                organization=membership.organization,
                user=request.user,
                job=job,
                data=request.data,
            )
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))
        except KeyError as exc:
            raise ValidationError(f"Missing required field: {exc}")

        return Response(SludgeWasteManifestSerializer(manifest).data, status=status.HTTP_201_CREATED)


class CoatingInspectionListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = CoatingInspection.objects.filter(organization=membership.organization).select_related("job")

        job_id = request.query_params.get("job_id")
        if job_id:
            qs = qs.filter(job__public_id=job_id)

        passed = request.query_params.get("passed")
        if passed is not None:
            qs = qs.filter(passed=passed.lower() == "true")

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = CoatingInspectionSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized inspectors can record coating inspections.")

        job_id = request.data.get("job_id")
        if not job_id:
            raise ValidationError({"job_id": "job_id is required."})

        job = get_scoped_job(membership, job_id)

        try:
            inspection = TankWorksService.record_coating_inspection(
                organization=membership.organization,
                user=request.user,
                job=job,
                data=request.data,
            )
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))
        except KeyError as exc:
            raise ValidationError(f"Missing required field: {exc}")

        return Response(CoatingInspectionSerializer(inspection).data, status=status.HTTP_201_CREATED)


class CrewEquipmentUtilizationListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = CrewEquipmentUtilization.objects.filter(organization=membership.organization).select_related("job")

        job_id = request.query_params.get("job_id")
        if job_id:
            qs = qs.filter(job__public_id=job_id)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = CrewEquipmentUtilizationSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized staff can log resource utilization.")

        job_id = request.data.get("job_id")
        if not job_id:
            raise ValidationError({"job_id": "job_id is required."})

        job = get_scoped_job(membership, job_id)

        try:
            log = TankWorksService.log_utilization(
                organization=membership.organization,
                user=request.user,
                job=job,
                data=request.data,
            )
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))
        except KeyError as exc:
            raise ValidationError(f"Missing required field: {exc}")

        return Response(CrewEquipmentUtilizationSerializer(log).data, status=status.HTTP_201_CREATED)


class TankWorksSummaryView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        org = membership.organization

        jobs = TankFieldJob.objects.filter(organization=org)
        total_jobs = jobs.count()
        active_jobs = jobs.filter(status=TankFieldJob.Status.ACTIVE).count()
        permit_pending_jobs = jobs.filter(status=TankFieldJob.Status.PERMIT_PENDING).count()
        completed_jobs = jobs.filter(status=TankFieldJob.Status.COMPLETED).count()

        # Sludge totals
        sludge_manifests = SludgeWasteManifest.objects.filter(organization=org)
        total_waste_qty = sludge_manifests.aggregate(total=Sum("quantity"))["total"] or Decimal("0.00")

        # Coating stats
        inspections = CoatingInspection.objects.filter(organization=org)
        total_inspections = inspections.count()
        passed_inspections = inspections.filter(passed=True).count()

        # Utilization stats
        utilizations = CrewEquipmentUtilization.objects.filter(organization=org)
        total_man_hours = utilizations.aggregate(total=Sum("man_hours"))["total"] or Decimal("0.00")
        total_equipment_hours = utilizations.aggregate(total=Sum("equipment_hours"))["total"] or Decimal("0.00")

        return Response({
            "total_jobs": total_jobs,
            "active_jobs": active_jobs,
            "permit_pending_jobs": permit_pending_jobs,
            "completed_jobs": completed_jobs,
            "total_waste_evacuated_qty": str(total_waste_qty),
            "total_coating_inspections": total_inspections,
            "passed_coating_inspections": passed_inspections,
            "total_man_hours": str(total_man_hours),
            "total_equipment_hours": str(total_equipment_hours),
        })
