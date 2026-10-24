import uuid
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from organizations.context import resolve_membership
from refinery_link.models import (
    BatchQualityCertificate,
    DepotTank,
    GantryMeterTicket,
    OfftakeAppointment,
    RefineryAuditEvent,
    TankGaugeDip,
    Terminal,
)
from refinery_link.permissions import can_write
from refinery_link.serializers import (
    BatchQualityCertificateSerializer,
    DepotTankSerializer,
    GantryMeterTicketSerializer,
    OfftakeAppointmentSerializer,
    RefineryAuditEventSerializer,
    TankGaugeDipSerializer,
    TerminalSerializer,
)
from refinery_link.services import ConflictError, RefineryService


class StandardPagination(PageNumberPagination):
    page_size = 20
    max_page_size = 100
    page_size_query_param = "page_size"


class TerminalListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        terminals = Terminal.objects.filter(organization=membership.organization)
        serializer = TerminalSerializer(terminals, many=True)
        return Response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only owners and administrators can manage terminals.")

        serializer = TerminalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        terminal = serializer.save(organization=membership.organization)
        return Response(TerminalSerializer(terminal).data, status=status.HTTP_201_CREATED)


class DepotTankListCreateView(APIView):
    pagination_class = StandardPagination

    def get(self, request):
        membership = resolve_membership(request)
        qs = DepotTank.objects.filter(organization=membership.organization).select_related("terminal")

        terminal_id = request.query_params.get("terminal_id")
        if terminal_id:
            qs = qs.filter(terminal__public_id=terminal_id)

        product_type = request.query_params.get("product_type")
        if product_type:
            qs = qs.filter(product_type=product_type)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request)
        serializer = DepotTankSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized staff can add depot tanks.")

        terminal_id = request.data.get("terminal_id")
        if not terminal_id:
            raise ValidationError({"terminal_id": "Terminal ID is required."})

        try:
            terminal = Terminal.objects.get(public_id=terminal_id, organization=membership.organization)
        except (Terminal.DoesNotExist, ValueError):
            raise NotFound("Terminal not found in this organization.")

        serializer = DepotTankSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tank = serializer.save(organization=membership.organization, terminal=terminal)
        return Response(DepotTankSerializer(tank).data, status=status.HTTP_201_CREATED)


class OfftakeAppointmentListCreateView(APIView):
    pagination_class = StandardPagination

    def get(self, request):
        membership = resolve_membership(request)
        qs = OfftakeAppointment.objects.filter(organization=membership.organization).select_related("terminal")

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(reference__icontains=search)
                | Q(truck_plate__icontains=search)
                | Q(driver_name__icontains=search)
                | Q(rfid_tag__icontains=search)
                | Q(holding_park_slot__icontains=search)
            )

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        terminal_id = request.query_params.get("terminal_id")
        if terminal_id:
            qs = qs.filter(terminal__public_id=terminal_id)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request)
        serializer = OfftakeAppointmentSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Permission denied.")

        terminal_id = request.data.get("terminal_id")
        if not terminal_id:
            raise ValidationError({"terminal_id": "Terminal ID is required."})

        try:
            terminal = Terminal.objects.get(public_id=terminal_id, organization=membership.organization)
        except (Terminal.DoesNotExist, ValueError):
            raise NotFound("Terminal not found in this organization.")

        try:
            appointment = RefineryService.create_appointment(
                organization=membership.organization,
                user=request.user,
                terminal=terminal,
                data=request.data,
            )
        except DjangoValidationError as exc:
            raise ValidationError(exc.messages if hasattr(exc, "messages") else str(exc))

        return Response(OfftakeAppointmentSerializer(appointment).data, status=status.HTTP_201_CREATED)


class OfftakeAppointmentDetailView(APIView):
    def get(self, request, public_id):
        membership = resolve_membership(request)
        try:
            appointment = OfftakeAppointment.objects.select_related("terminal").get(
                public_id=public_id, organization=membership.organization
            )
        except (OfftakeAppointment.DoesNotExist, ValueError):
            raise NotFound("Appointment not found.")

        serializer = OfftakeAppointmentSerializer(appointment)
        data = serializer.data
        audits = RefineryAuditEvent.objects.filter(
            organization=membership.organization, target_id=appointment.public_id
        ).select_related("actor")
        data["audit_events"] = RefineryAuditEventSerializer(audits, many=True).data
        return Response(data)


class OfftakeAppointmentTransitionView(APIView):
    def post(self, request, public_id, action):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Permission denied.")

        try:
            appointment = OfftakeAppointment.objects.select_related("terminal").get(
                public_id=public_id, organization=membership.organization
            )
        except (OfftakeAppointment.DoesNotExist, ValueError):
            raise NotFound("Appointment not found.")

        version = request.data.get("version")
        if version is None:
            raise ValidationError({"version": "Current version number is required."})

        reason = request.data.get("reason", "")

        try:
            updated = RefineryService.transition_appointment(
                organization=membership.organization,
                user=request.user,
                appointment=appointment,
                action=action,
                version=int(version),
                reason=reason,
            )
        except ConflictError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_409_CONFLICT)
        except DjangoValidationError as exc:
            raise ValidationError(exc.messages if hasattr(exc, "messages") else str(exc))

        return Response(OfftakeAppointmentSerializer(updated).data)


class TankGaugeDipListCreateView(APIView):
    pagination_class = StandardPagination

    def get(self, request):
        membership = resolve_membership(request)
        qs = TankGaugeDip.objects.filter(organization=membership.organization).select_related("tank", "tank__terminal")

        tank_id = request.query_params.get("tank_id")
        if tank_id:
            qs = qs.filter(tank__public_id=tank_id)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request)
        serializer = TankGaugeDipSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Permission denied.")

        tank_id = request.data.get("tank_id")
        if not tank_id:
            raise ValidationError({"tank_id": "Tank ID is required."})

        try:
            tank = DepotTank.objects.get(public_id=tank_id, organization=membership.organization)
        except (DepotTank.DoesNotExist, ValueError):
            raise NotFound("Tank not found.")

        try:
            dip = RefineryService.record_tank_dip(
                organization=membership.organization,
                user=request.user,
                tank=tank,
                data=request.data,
            )
        except DjangoValidationError as exc:
            raise ValidationError(exc.messages if hasattr(exc, "messages") else str(exc))

        return Response(TankGaugeDipSerializer(dip).data, status=status.HTTP_201_CREATED)


class GantryMeterTicketListCreateView(APIView):
    pagination_class = StandardPagination

    def get(self, request):
        membership = resolve_membership(request)
        qs = GantryMeterTicket.objects.filter(organization=membership.organization).select_related("appointment", "tank")

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(ticket_number__icontains=search)
                | Q(meter_id__icontains=search)
                | Q(appointment__truck_plate__icontains=search)
            )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request)
        serializer = GantryMeterTicketSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Permission denied.")

        appointment_id = request.data.get("appointment_id")
        tank_id = request.data.get("tank_id")

        if not appointment_id or not tank_id:
            raise ValidationError({"error": "Both appointment_id and tank_id are required."})

        try:
            appointment = OfftakeAppointment.objects.get(public_id=appointment_id, organization=membership.organization)
        except (OfftakeAppointment.DoesNotExist, ValueError):
            raise NotFound("Appointment not found.")

        try:
            tank = DepotTank.objects.get(public_id=tank_id, organization=membership.organization)
        except (DepotTank.DoesNotExist, ValueError):
            raise NotFound("Tank not found.")

        try:
            ticket = RefineryService.issue_meter_ticket(
                organization=membership.organization,
                user=request.user,
                appointment=appointment,
                tank=tank,
                data=request.data,
            )
        except DjangoValidationError as exc:
            raise ValidationError(exc.messages if hasattr(exc, "messages") else str(exc))

        return Response(GantryMeterTicketSerializer(ticket).data, status=status.HTTP_201_CREATED)


class BatchQualityCertificateListCreateView(APIView):
    pagination_class = StandardPagination

    def get(self, request):
        membership = resolve_membership(request)
        qs = BatchQualityCertificate.objects.filter(organization=membership.organization)

        product_type = request.query_params.get("product_type")
        if product_type:
            qs = qs.filter(product_type=product_type)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(certificate_number__icontains=search)
                | Q(batch_number__icontains=search)
                | Q(laboratory_name__icontains=search)
            )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request)
        serializer = BatchQualityCertificateSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Permission denied.")

        try:
            cert = RefineryService.record_quality_certificate(
                organization=membership.organization,
                user=request.user,
                data=request.data,
            )
        except DjangoValidationError as exc:
            raise ValidationError(exc.messages if hasattr(exc, "messages") else str(exc))

        return Response(BatchQualityCertificateSerializer(cert).data, status=status.HTTP_201_CREATED)


class RefinerySummaryView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        org = membership.organization

        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        throughput_litres = GantryMeterTicket.objects.filter(
            organization=org, completed_at__gte=today_start
        ).aggregate(total=Sum("net_volume_litres"))["total"] or Decimal("0.00")

        holding_park_queue = OfftakeAppointment.objects.filter(
            organization=org, status=OfftakeAppointment.Status.CHECKED_IN
        ).count()

        called_up_queue = OfftakeAppointment.objects.filter(
            organization=org, status=OfftakeAppointment.Status.CALLED_UP
        ).count()

        reconciled_tickets = GantryMeterTicket.objects.filter(
            organization=org, status=GantryMeterTicket.Status.RECONCILED
        ).count()

        flagged_tickets = GantryMeterTicket.objects.filter(
            organization=org, status=GantryMeterTicket.Status.FLAGGED_VARIANCE
        ).count()

        active_tanks = DepotTank.objects.filter(
            organization=org, current_status__in=[DepotTank.Status.DISPENSING, DepotTank.Status.RECEIVING]
        ).count()

        return Response({
            "today_throughput_litres": str(throughput_litres),
            "holding_park_queue_count": holding_park_queue,
            "called_up_queue_count": called_up_queue,
            "reconciled_tickets_count": reconciled_tickets,
            "flagged_tickets_count": flagged_tickets,
            "active_tanks_count": active_tanks,
        })
