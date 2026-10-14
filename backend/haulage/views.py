import io
import uuid

import qrcode
import qrcode.image.svg
from django.db import IntegrityError, transaction
from django.db.models import F, Q, Sum
from django.http import FileResponse, HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from organizations.context import resolve_membership

from .models import Customer, DeliveryLocation, Dispatch, Driver, ElectronicWaybill, Fleet, ProofOfDelivery, Trailer, Truck, WeighbridgeReading
from .pdf import render_delivery_pdf
from .permissions import can_write
from .serializers import (
    CustomerSerializer, DispatchDetailSerializer, DispatchListSerializer, DispatchWriteSerializer,
    DriverSerializer, FleetSerializer, FleetStageSerializer, LocationSerializer, ProofOfDeliverySerializer, TrailerSerializer,
    TransitionSerializer, TruckSerializer, WaybillCreateSerializer, WeighbridgeReadingSerializer,
)
from .services import audit, cancel_dispatch, ensure_version, save_fleet_stage, transition_dispatch, validate_dispatch_ready


class DispatchPagination(PageNumberPagination):
    page_size = 20
    max_page_size = 100
    page_size_query_param = "page_size"


def scoped_dispatch(request, public_id):
    membership = resolve_membership(request)
    try:
        dispatch = Dispatch.objects.select_related(
            "fleet", "customer", "origin", "destination", "truck", "trailer", "driver", "organization"
        ).prefetch_related("weighbridge_readings", "audit_events").get(
            organization=membership.organization, public_id=public_id
        )
    except (Dispatch.DoesNotExist, ValueError):
        raise NotFound("Dispatch not found.")
    return membership, dispatch


def scoped_fleet(request, public_id):
    membership = resolve_membership(request)
    try:
        fleet = Fleet.objects.select_related(
            "customer", "origin", "destination", "truck", "trailer", "driver", "organization"
        ).get(organization=membership.organization, public_id=public_id)
    except (Fleet.DoesNotExist, ValueError):
        raise NotFound("Fleet not found.")
    return membership, fleet


class FleetListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        queryset = Fleet.objects.filter(organization=membership.organization).select_related(
            "customer", "origin", "destination", "truck", "trailer", "driver"
        )
        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(reference__icontains=search) | Q(customer__name__icontains=search)
                | Q(truck__registration_number__icontains=search) | Q(driver__full_name__icontains=search)
            )
        return Response(FleetSerializer(queryset[:100], many=True).data)

    @transaction.atomic
    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot create fleet drafts.")
        fleet = Fleet.objects.create(
            organization=membership.organization,
            reference=f"FLT-{uuid.uuid4().hex[:10].upper()}",
            created_by=membership.user,
            updated_by=membership.user,
        )
        return Response(FleetSerializer(fleet).data, status=status.HTTP_201_CREATED)


class FleetDetailView(APIView):
    def get(self, request, public_id):
        _, fleet = scoped_fleet(request, public_id)
        return Response(FleetSerializer(fleet).data)


class FleetStageView(APIView):
    def post(self, request, public_id):
        membership, fleet = scoped_fleet(request, public_id)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot update fleet drafts.")
        envelope = FleetStageSerializer(data=request.data)
        envelope.is_valid(raise_exception=True)
        stage = envelope.validated_data["stage"]
        raw_data = envelope.validated_data["data"]
        serializer_map = {
            "customer": CustomerSerializer,
            "truck": TruckSerializer,
            "trailer": TrailerSerializer,
            "driver": DriverSerializer,
        }
        if stage == "route":
            if not isinstance(raw_data.get("origin"), dict) or not isinstance(raw_data.get("destination"), dict):
                raise ValidationError({"data": "Origin and destination are required."})
            origin = LocationSerializer(data=raw_data["origin"])
            destination = LocationSerializer(data=raw_data["destination"])
            origin.is_valid(raise_exception=True)
            destination.is_valid(raise_exception=True)
            stage_data = {"origin": origin.validated_data, "destination": destination.validated_data}
        else:
            stage_serializer = serializer_map[stage](data=raw_data)
            stage_serializer.is_valid(raise_exception=True)
            stage_data = stage_serializer.validated_data
        updated = save_fleet_stage(
            fleet=fleet, membership=membership, stage=stage, data=stage_data,
            version=envelope.validated_data["version"],
        )
        updated = Fleet.objects.select_related("customer", "origin", "destination", "truck", "trailer", "driver").get(pk=updated.pk)
        return Response(FleetSerializer(updated).data)


class ReferenceListCreateView(APIView):
    model = None
    serializer_class = None
    search_fields = ()

    def get(self, request):
        membership = resolve_membership(request)
        queryset = self.model.objects.filter(organization=membership.organization)
        search = request.query_params.get("search", "").strip()
        if search:
            query = Q()
            for field in self.search_fields:
                query |= Q(**{f"{field}__icontains": search})
            queryset = queryset.filter(query)
        return Response(self.serializer_class(queryset[:200], many=True).data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot register operational records.")
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            instance = serializer.save(organization=membership.organization)
        except IntegrityError:
            raise ValidationError({"detail": "A matching record already exists in your organization."})
        return Response(self.serializer_class(instance).data, status=status.HTTP_201_CREATED)


class CustomerListCreateView(ReferenceListCreateView):
    model = Customer
    serializer_class = CustomerSerializer
    search_fields = ("name", "contact_name")


class LocationListCreateView(ReferenceListCreateView):
    model = DeliveryLocation
    serializer_class = LocationSerializer
    search_fields = ("name", "address")


class TruckListCreateView(ReferenceListCreateView):
    model = Truck
    serializer_class = TruckSerializer
    search_fields = ("registration_number", "fleet_number", "make_model")


class TrailerListCreateView(ReferenceListCreateView):
    model = Trailer
    serializer_class = TrailerSerializer
    search_fields = ("registration_number", "fleet_number")


class DriverListCreateView(ReferenceListCreateView):
    model = Driver
    serializer_class = DriverSerializer
    search_fields = ("full_name", "licence_number")


class DispatchListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        queryset = Dispatch.objects.filter(organization=membership.organization).select_related(
            "fleet", "customer", "origin", "destination", "truck", "trailer", "driver", "waybill"
        )
        search = request.query_params.get("search", "").strip()
        status_filter = request.query_params.get("status", "").strip()
        if search:
            queryset = queryset.filter(
                Q(reference__icontains=search) | Q(customer__name__icontains=search)
                | Q(truck__registration_number__icontains=search) | Q(driver__full_name__icontains=search)
                | Q(waybill__number__icontains=search) | Q(destination__name__icontains=search)
            )
        if status_filter:
            if status_filter not in Dispatch.Status.values:
                raise ValidationError({"status": "Unknown dispatch status."})
            queryset = queryset.filter(status=status_filter)
        paginator = DispatchPagination()
        page = paginator.paginate_queryset(queryset, request)
        return paginator.get_paginated_response(DispatchListSerializer(page, many=True).data)

    @transaction.atomic
    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot create dispatches.")
        serializer = DispatchWriteSerializer(data=request.data, context={"organization": membership.organization})
        serializer.is_valid(raise_exception=True)
        reference = serializer.validated_data.pop("reference", "") or f"DSP-{uuid.uuid4().hex[:10].upper()}"
        try:
            dispatch = serializer.save(
                organization=membership.organization, reference=reference,
                created_by=membership.user, updated_by=membership.user,
            )
        except IntegrityError:
            raise ValidationError({"reference": "This dispatch reference already exists."})
        audit(dispatch=dispatch, actor=membership.user, action="create", from_status="new", to_status=dispatch.status)
        return Response(DispatchDetailSerializer(dispatch, context={"membership": membership}).data, status=status.HTTP_201_CREATED)


class DispatchDetailView(APIView):
    def get(self, request, public_id):
        membership, dispatch = scoped_dispatch(request, public_id)
        return Response(DispatchDetailSerializer(dispatch, context={"membership": membership}).data)

    @transaction.atomic
    def patch(self, request, public_id):
        membership, dispatch = scoped_dispatch(request, public_id)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot edit dispatches.")
        locked = Dispatch.objects.select_for_update().get(pk=dispatch.pk)
        if locked.status != Dispatch.Status.DRAFT:
            raise ValidationError({"status": "Only a draft dispatch can be edited."})
        version = request.data.get("version")
        ensure_version(locked, version)
        serializer = DispatchWriteSerializer(locked, data=request.data, partial=True, context={"organization": membership.organization})
        serializer.is_valid(raise_exception=True)
        serializer.validated_data.pop("version", None)
        updated = serializer.save(updated_by=membership.user, version=locked.version + 1)
        audit(dispatch=updated, actor=membership.user, action="edit", reason=request.data.get("reason", ""), metadata={"version": updated.version})
        return Response(DispatchDetailSerializer(updated, context={"membership": membership}).data)


class DispatchTransitionView(APIView):
    def post(self, request, public_id, action):
        membership, dispatch = scoped_dispatch(request, public_id)
        serializer = TransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if action == "cancel":
            updated = cancel_dispatch(dispatch=dispatch, membership=membership, **serializer.validated_data)
        else:
            updated = transition_dispatch(dispatch=dispatch, membership=membership, action=action, **serializer.validated_data)
        return Response(DispatchDetailSerializer(updated, context={"membership": membership}).data)


class WeighbridgeReadingCreateView(APIView):
    @transaction.atomic
    def post(self, request, public_id):
        membership, dispatch = scoped_dispatch(request, public_id)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot record weighbridge readings.")
        if request.data.get("source") not in (None, "", WeighbridgeReading.Source.MANUAL):
            raise ValidationError({"source": "External weighbridge capture is not available."})
        locked = Dispatch.objects.select_for_update().get(pk=dispatch.pk)
        if locked.status != Dispatch.Status.DRAFT:
            raise ValidationError({"status": "Readings can only be recorded for a draft dispatch."})
        serializer = WeighbridgeReadingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        version = serializer.validated_data.pop("version")
        ensure_version(locked, version)
        try:
            reading = serializer.save(
                organization=membership.organization, dispatch=locked,
                source=WeighbridgeReading.Source.MANUAL, recorded_by=membership.user,
            )
        except IntegrityError:
            raise ValidationError({"kind": "This dispatch already has that reading. Recorded readings are immutable."})
        locked.version = F("version") + 1
        locked.updated_by = membership.user
        locked.save(update_fields=("version", "updated_by", "updated_at"))
        locked.refresh_from_db()
        audit(dispatch=locked, actor=membership.user, action=f"record_{reading.kind}", metadata={"reading_id": str(reading.public_id), "source": "manual"})
        return Response(DispatchDetailSerializer(locked, context={"membership": membership}).data, status=status.HTTP_201_CREATED)


class WaybillCreateView(APIView):
    @transaction.atomic
    def post(self, request, public_id):
        membership, dispatch = scoped_dispatch(request, public_id)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot generate e-Waybills.")
        serializer = WaybillCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        locked = Dispatch.objects.select_for_update().get(pk=dispatch.pk)
        ensure_version(locked, serializer.validated_data["version"])
        if locked.status != Dispatch.Status.DRAFT:
            raise ValidationError({"status": "An e-Waybill can only be generated for a draft dispatch."})
        if hasattr(locked, "waybill"):
            raise ValidationError({"detail": "This dispatch already has an e-Waybill."})
        readings = {r.kind: r for r in locked.weighbridge_readings.all()}
        if set(readings) != {"tare", "gross"} or readings["gross"].weight_kg <= readings["tare"].weight_kg:
            raise ValidationError({"detail": "Valid tare and gross readings are required first."})
        number = serializer.validated_data.get("number") or f"EWB-{timezone.now():%Y}-{uuid.uuid4().hex[:8].upper()}"
        try:
            waybill = ElectronicWaybill.objects.create(
                organization=membership.organization, dispatch=locked, number=number, issued_by=membership.user,
            )
        except IntegrityError:
            raise ValidationError({"number": "This e-Waybill number already exists."})
        locked.version = F("version") + 1
        locked.updated_by = membership.user
        locked.save(update_fields=("version", "updated_by", "updated_at"))
        locked.refresh_from_db()
        audit(dispatch=locked, actor=membership.user, action="generate_waybill", metadata={"waybill": waybill.number})
        return Response(DispatchDetailSerializer(locked, context={"membership": membership}).data, status=status.HTTP_201_CREATED)


class ProofOfDeliveryCreateView(APIView):
    @transaction.atomic
    def post(self, request, public_id):
        membership, dispatch = scoped_dispatch(request, public_id)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot record proof of delivery.")
        serializer = ProofOfDeliverySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        locked = Dispatch.objects.select_for_update().get(pk=dispatch.pk)
        version = serializer.validated_data.pop("version")
        ensure_version(locked, version)
        if locked.status != Dispatch.Status.DISCHARGING:
            raise ValidationError({"status": "Proof of delivery can only be recorded while discharging."})
        if hasattr(locked, "proof_of_delivery"):
            raise ValidationError({"detail": "Proof of delivery is already recorded and is immutable."})
        pod = serializer.save(organization=membership.organization, dispatch=locked, recorded_by=membership.user)
        previous = locked.status
        locked.status = Dispatch.Status.DELIVERED
        locked.version = F("version") + 1
        locked.updated_by = membership.user
        locked.save(update_fields=("status", "version", "updated_by", "updated_at"))
        locked.refresh_from_db()
        audit(
            dispatch=locked, actor=membership.user, action="record_pod",
            from_status=previous, to_status=locked.status,
            metadata={"pod_id": str(pod.public_id), "receiver": pod.receiver_name},
        )
        return Response(DispatchDetailSerializer(locked, context={"membership": membership}).data, status=status.HTTP_201_CREATED)


class HaulageSummaryView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        queryset = Dispatch.objects.filter(organization=membership.organization)
        active = queryset.exclude(status__in=(Dispatch.Status.CLOSED, Dispatch.Status.CANCELLED))
        return Response({
            "active_trips": active.count(),
            "draft_dispatches": queryset.filter(status=Dispatch.Status.DRAFT).count(),
            "closed_trips": queryset.filter(status=Dispatch.Status.CLOSED).count(),
            "planned_quantity_litres": str(active.aggregate(total=Sum("planned_quantity_litres"))["total"] or 0),
        })


def verification_payload(dispatch, request):
    return request.build_absolute_uri(f"/api/v1/haultrac/dispatches/{dispatch.public_id}/waybill/verify/{dispatch.waybill.verification_code}/")


class WaybillQRView(APIView):
    def get(self, request, public_id):
        membership, dispatch = scoped_dispatch(request, public_id)
        if not hasattr(dispatch, "waybill"):
            raise NotFound("No e-Waybill exists for this dispatch.")
        image = qrcode.make(verification_payload(dispatch, request), image_factory=qrcode.image.svg.SvgPathImage, box_size=8, border=2)
        output = io.BytesIO()
        image.save(output)
        audit(dispatch=dispatch, actor=membership.user, action="view_waybill_qr")
        return HttpResponse(output.getvalue(), content_type="image/svg+xml", headers={"Cache-Control": "private, no-store"})


class WaybillVerifyView(APIView):
    def get(self, request, public_id, code):
        membership, dispatch = scoped_dispatch(request, public_id)
        if not hasattr(dispatch, "waybill") or dispatch.waybill.verification_code != code:
            raise NotFound("e-Waybill verification failed.")
        audit(dispatch=dispatch, actor=membership.user, action="verify_waybill")
        return Response({
            "valid": True, "waybill_number": dispatch.waybill.number, "dispatch_reference": dispatch.reference,
            "status": dispatch.status, "truck_registration": dispatch.truck.registration_number,
            "trailer_registration": dispatch.trailer.registration_number, "product": dispatch.product,
            "planned_quantity_litres": str(dispatch.planned_quantity_litres),
            "origin": dispatch.origin.name, "destination": dispatch.destination.name,
        })


class DeliveryExportView(APIView):
    def get(self, request, public_id):
        membership, dispatch = scoped_dispatch(request, public_id)
        if dispatch.status != Dispatch.Status.CLOSED or not hasattr(dispatch, "proof_of_delivery"):
            raise ValidationError({"status": "The trip must be closed before export."})
        readings = {item.kind: item for item in dispatch.weighbridge_readings.all()}
        data = {
            "reference": dispatch.reference, "waybill": dispatch.waybill.number,
            "customer": dispatch.customer.name, "origin": dispatch.origin.name, "destination": dispatch.destination.name,
            "truck": dispatch.truck.registration_number, "trailer": dispatch.trailer.registration_number,
            "driver": dispatch.driver.full_name, "product": dispatch.product,
            "planned_quantity": f"{dispatch.planned_quantity_litres:,.3f} L",
            "tare": f"{readings['tare'].weight_kg:,.3f} kg", "gross": f"{readings['gross'].weight_kg:,.3f} kg",
            "net": f"{readings['gross'].weight_kg - readings['tare'].weight_kg:,.3f} kg",
            "delivered_quantity": f"{dispatch.proof_of_delivery.delivered_quantity_litres:,.3f} L",
            "ullage": f"{dispatch.proof_of_delivery.ullage_mm:,.3f} mm",
            "temperature": f"{dispatch.proof_of_delivery.observed_temperature_c:,.3f} C",
            "water_test": dispatch.proof_of_delivery.get_water_paste_result_display(),
            "receiver": dispatch.proof_of_delivery.receiver_name,
            "receiver_title": dispatch.proof_of_delivery.receiver_title,
            "acknowledged_at": dispatch.proof_of_delivery.receiver_acknowledged_at.strftime("%d %b %Y, %H:%M UTC"),
            "closed_at": dispatch.updated_at.strftime("%d %b %Y, %H:%M UTC"),
            "record_id": str(dispatch.public_id),
            "qr_matrix": qrcode.QRCode(version=None, box_size=1, border=0),
        }
        data["qr_matrix"].add_data(verification_payload(dispatch, request))
        data["qr_matrix"].make(fit=True)
        data["qr_matrix"] = data["qr_matrix"].get_matrix()
        audit(dispatch=dispatch, actor=membership.user, action="export_delivery_document")
        return FileResponse(io.BytesIO(render_delivery_pdf(data)), as_attachment=True, filename=f"{dispatch.waybill.number}.pdf", content_type="application/pdf")
