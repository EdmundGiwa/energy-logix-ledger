from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from organizations.context import resolve_membership
from owner_dashboard.models import (
    Currency,
    ExecutiveExceptionAlert,
    ExecutiveExportJob,
    ExecutiveKpiSnapshot,
)
from owner_dashboard.permissions import (
    can_manage_owner_exceptions,
    can_request_executive_exports,
    can_view_owner_dashboard,
)
from owner_dashboard.serializers import (
    CreateExceptionRequestSerializer,
    ExecutiveExceptionAlertSerializer,
    ExecutiveExportJobSerializer,
    ExecutiveKpiSnapshotSerializer,
    RequestExportJobSerializer,
)
from owner_dashboard.services import OwnerDashboardService


class StandardPagination(PageNumberPagination):
    page_size = 20
    max_page_size = 100
    page_size_query_param = "page_size"


class ExecutiveLiveKpisView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        if not can_view_owner_dashboard(membership):
            raise PermissionDenied("You do not have access to the owner dashboard.")

        currency_param = request.query_params.get("currency", Currency.USD).upper()
        if currency_param not in [Currency.USD, Currency.NGN]:
            currency_param = Currency.USD

        snapshot = OwnerDashboardService.compute_live_kpis(
            organization=membership.organization,
            currency=currency_param,
        )
        serializer = ExecutiveKpiSnapshotSerializer(snapshot)
        return Response(serializer.data)


class ExecutiveExceptionFeedView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        if not can_view_owner_dashboard(membership):
            raise PermissionDenied("You do not have access to the owner dashboard.")

        severity = request.query_params.get("severity")
        module = request.query_params.get("module")
        is_ack_raw = request.query_params.get("is_acknowledged")
        is_ack = None
        if is_ack_raw is not None:
            is_ack = is_ack_raw.lower() in ["true", "1", "yes"]

        qs = OwnerDashboardService.get_exception_feed(
            organization=membership.organization,
            severity=severity,
            module=module,
            is_acknowledged=is_ack,
        )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = ExecutiveExceptionAlertSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_manage_owner_exceptions(membership):
            raise PermissionDenied("Only owners and admins can post executive exceptions.")

        serializer = CreateExceptionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        alert = OwnerDashboardService.record_exception(
            organization=membership.organization,
            severity=serializer.validated_data["severity"],
            module=serializer.validated_data["module"],
            title=serializer.validated_data["title"],
            description=serializer.validated_data["description"],
            source_record_type=serializer.validated_data["source_record_type"],
            source_record_id=serializer.validated_data["source_record_id"],
            source_url=serializer.validated_data.get("source_url", ""),
            variance_percent=serializer.validated_data.get("variance_percent"),
        )
        return Response(ExecutiveExceptionAlertSerializer(alert).data, status=status.HTTP_201_CREATED)


class ExecutiveExceptionAcknowledgeView(APIView):
    def post(self, request, public_id):
        membership = resolve_membership(request)
        if not can_manage_owner_exceptions(membership):
            raise PermissionDenied("Only owners and admins can acknowledge executive exceptions.")

        try:
            alert = OwnerDashboardService.acknowledge_exception(
                organization=membership.organization,
                user=request.user,
                public_id=public_id,
            )
        except DjangoValidationError as exc:
            raise NotFound(str(exc))

        return Response(ExecutiveExceptionAlertSerializer(alert).data)


class ExecutiveExportJobListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        if not can_view_owner_dashboard(membership):
            raise PermissionDenied("You do not have access to executive exports.")

        qs = ExecutiveExportJob.objects.filter(organization=membership.organization)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = ExecutiveExportJobSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_request_executive_exports(membership):
            raise PermissionDenied("Only owners and admins can generate executive reports.")

        serializer = RequestExportJobSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        job = OwnerDashboardService.create_export_job(
            organization=membership.organization,
            user=request.user,
            report_type=serializer.validated_data["report_type"],
            filters=serializer.validated_data.get("filters"),
            file_format=serializer.validated_data.get("file_format", ExecutiveExportJob.FileFormat.PDF),
        )
        return Response(ExecutiveExportJobSerializer(job).data, status=status.HTTP_201_CREATED)


class ExecutiveExportJobDetailView(APIView):
    def get(self, request, public_id):
        membership = resolve_membership(request)
        if not can_view_owner_dashboard(membership):
            raise PermissionDenied("You do not have access to executive exports.")

        try:
            job = ExecutiveExportJob.objects.get(organization=membership.organization, public_id=public_id)
        except ExecutiveExportJob.DoesNotExist:
            raise NotFound("Executive export job not found.")

        serializer = ExecutiveExportJobSerializer(job)
        return Response(serializer.data)
