import io
import uuid

from django.db import IntegrityError, transaction
from django.db.models import Count, Q, Sum
from django.http import FileResponse
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from organizations.context import resolve_membership

from .models import BunkerDeliveryNote, Nomination, Sounding
from .permissions import can_write
from .pdf import render_bdn_pdf
from .serializers import (
    BDNCreateSerializer,
    NominationDetailSerializer,
    NominationListSerializer,
    NominationWriteSerializer,
    SoundingReviewSerializer,
    SoundingSerializer,
    TransitionSerializer,
)
from .services import audit, cancel_nomination, ensure_version, transition_nomination


class NominationPagination(PageNumberPagination):
    page_size = 20
    max_page_size = 100
    page_size_query_param = "page_size"


def scoped_nomination(request, public_id, *, lock=False):
    membership = resolve_membership(request)
    queryset = Nomination.objects.filter(organization=membership.organization)
    if lock:
        queryset = queryset.select_for_update()
    try:
        nomination = queryset.get(public_id=public_id)
    except (Nomination.DoesNotExist, ValueError):
        from rest_framework.exceptions import NotFound
        raise NotFound("Nomination not found.")
    return membership, nomination


class NominationListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        queryset = Nomination.objects.filter(organization=membership.organization).annotate(sounding_count=Count("soundings"))
        search = request.query_params.get("search", "").strip()
        status_filter = request.query_params.get("status", "").strip()
        ordering = request.query_params.get("ordering", "-created_at")
        allowed_ordering = {"created_at", "-created_at", "delivery_window_start", "-delivery_window_start", "vessel_name", "-vessel_name"}
        if search:
            queryset = queryset.filter(
                Q(reference__icontains=search) | Q(customer_name__icontains=search)
                | Q(vessel_name__icontains=search) | Q(imo_number__icontains=search)
                | Q(port__icontains=search) | Q(product_grade__icontains=search)
            )
        if status_filter:
            if status_filter not in Nomination.Status.values:
                raise ValidationError({"status": "Unknown nomination status."})
            queryset = queryset.filter(status=status_filter)
        queryset = queryset.order_by(ordering if ordering in allowed_ordering else "-created_at")
        paginator = NominationPagination()
        page = paginator.paginate_queryset(queryset, request)
        return paginator.get_paginated_response(NominationListSerializer(page, many=True).data)

    @transaction.atomic
    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot create nominations.")
        serializer = NominationWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reference = serializer.validated_data.pop("reference", "") or f"NOM-{uuid.uuid4().hex[:10].upper()}"
        try:
            nomination = serializer.save(
                organization=membership.organization,
                reference=reference,
                created_by=request.user,
                updated_by=request.user,
            )
        except IntegrityError:
            raise ValidationError({"reference": "This nomination reference is already in use."})
        audit(nomination=nomination, actor=request.user, action="create", to_status=nomination.status)
        return Response(NominationDetailSerializer(nomination, context={"membership": membership}).data, status=status.HTTP_201_CREATED)


class NominationDetailView(APIView):
    def get(self, request, public_id):
        membership, nomination = scoped_nomination(request, public_id)
        nomination = Nomination.objects.prefetch_related("soundings", "audit_events__actor").select_related("bdn").get(pk=nomination.pk)
        return Response(NominationDetailSerializer(nomination, context={"membership": membership}).data)

    @transaction.atomic
    def patch(self, request, public_id):
        membership, nomination = scoped_nomination(request, public_id, lock=True)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot edit nominations.")
        if nomination.status != Nomination.Status.DRAFT:
            from rest_framework.exceptions import APIException
            error = APIException("Only draft nominations can be edited.")
            error.status_code = status.HTTP_409_CONFLICT
            raise error
        serializer = NominationWriteSerializer(nomination, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        version = serializer.validated_data.pop("version", None)
        if version is None:
            raise ValidationError({"version": "This field is required."})
        ensure_version(nomination, version)
        serializer.save(version=nomination.version + 1, updated_by=request.user)
        audit(nomination=nomination, actor=request.user, action="update", metadata={"fields": sorted(serializer.validated_data.keys())})
        return Response(NominationDetailSerializer(nomination, context={"membership": membership}).data)


class NominationTransitionView(APIView):
    def post(self, request, public_id, action):
        membership, nomination = scoped_nomination(request, public_id)
        serializer = TransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if action == "cancel":
            nomination = cancel_nomination(nomination=nomination, membership=membership, **serializer.validated_data)
        else:
            nomination = transition_nomination(nomination=nomination, membership=membership, action=action, **serializer.validated_data)
        return Response(NominationDetailSerializer(nomination, context={"membership": membership}).data)


class SoundingCreateView(APIView):
    @transaction.atomic
    def post(self, request, public_id):
        membership, nomination = scoped_nomination(request, public_id, lock=True)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot record soundings.")
        if nomination.status not in {Nomination.Status.CONFIRMED, Nomination.Status.SOUNDING_RECORDED}:
            raise ValidationError({"nomination": "Soundings can only be recorded for a confirmed nomination."})
        serializer = SoundingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sounding = serializer.save(organization=membership.organization, nomination=nomination, recorded_by=request.user)
        audit(nomination=nomination, actor=request.user, action="record_sounding", metadata={"sounding_id": str(sounding.public_id)})
        return Response(SoundingSerializer(sounding).data, status=status.HTTP_201_CREATED)


class SoundingReviewView(APIView):
    @transaction.atomic
    def post(self, request, public_id):
        membership, nomination = scoped_nomination(request, public_id, lock=True)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot review soundings.")
        serializer = SoundingReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if nomination.status not in {Nomination.Status.CONFIRMED, Nomination.Status.SOUNDING_RECORDED}:
            raise ValidationError({"nomination": "Soundings cannot be reviewed after BDN preparation has started."})
        try:
            sounding = Sounding.objects.select_for_update().get(
                public_id=serializer.validated_data["sounding_id"],
                nomination=nomination,
                organization=membership.organization,
            )
        except Sounding.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Sounding not found.")
        ensure_version(sounding, serializer.validated_data["version"])
        if sounding.status != Sounding.Status.DRAFT:
            raise ValidationError({"sounding": "This sounding has already been reviewed."})
        from django.utils import timezone
        sounding.status = Sounding.Status.REVIEWED
        sounding.reviewed_by = request.user
        sounding.reviewed_at = timezone.now()
        sounding.version += 1
        sounding.save(update_fields=("status", "reviewed_by", "reviewed_at", "version", "updated_at"))
        if nomination.status == Nomination.Status.CONFIRMED:
            nomination.status = Nomination.Status.SOUNDING_RECORDED
            nomination.version += 1
            nomination.updated_by = request.user
            nomination.save(update_fields=("status", "version", "updated_by", "updated_at"))
        audit(nomination=nomination, actor=request.user, action="review_sounding", reason=serializer.validated_data["reason"], metadata={"sounding_id": str(sounding.public_id)})
        return Response(NominationDetailSerializer(nomination, context={"membership": membership}).data)


class BDNView(APIView):
    @transaction.atomic
    def post(self, request, public_id):
        membership, nomination = scoped_nomination(request, public_id, lock=True)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot create BDNs.")
        if nomination.status != Nomination.Status.SOUNDING_RECORDED:
            raise ValidationError({"nomination": "A reviewed sounding is required before creating the BDN."})
        if nomination.soundings.filter(status=Sounding.Status.DRAFT).exists():
            raise ValidationError({"nomination": "Review every saved sounding before creating the BDN."})
        if hasattr(nomination, "bdn"):
            raise ValidationError({"nomination": "This nomination already has a BDN."})
        serializer = BDNCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        version = serializer.validated_data.pop("version")
        ensure_version(nomination, version)
        try:
            bdn = serializer.save(organization=membership.organization, nomination=nomination, created_by=request.user)
        except IntegrityError:
            raise ValidationError({"number": "This BDN number is already in use."})
        nomination.status = Nomination.Status.BDN_DRAFT
        nomination.version += 1
        nomination.updated_by = request.user
        nomination.save(update_fields=("status", "version", "updated_by", "updated_at"))
        audit(nomination=nomination, actor=request.user, action="create_bdn", metadata={"bdn_id": str(bdn.public_id)})
        return Response(NominationDetailSerializer(nomination, context={"membership": membership}).data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def patch(self, request, public_id):
        membership, nomination = scoped_nomination(request, public_id, lock=True)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot edit BDNs.")
        if nomination.status != Nomination.Status.BDN_DRAFT:
            raise ValidationError({"nomination": "The BDN is no longer in an editable workflow state."})
        try:
            bdn = BunkerDeliveryNote.objects.select_for_update().get(nomination=nomination, organization=membership.organization)
        except BunkerDeliveryNote.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("BDN not found.")
        if bdn.status != BunkerDeliveryNote.Status.DRAFT:
            raise ValidationError({"bdn": "Only a draft BDN can be edited."})
        version = request.data.get("version")
        if version is None:
            raise ValidationError({"version": "This field is required."})
        ensure_version(bdn, int(version))
        serializer = BunkerDeliveryNoteSerializer(bdn, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(version=bdn.version + 1)
        audit(nomination=nomination, actor=request.user, action="update_bdn", metadata={"fields": sorted(serializer.validated_data.keys())})
        return Response(NominationDetailSerializer(nomination, context={"membership": membership}).data)


class BDNExportView(APIView):
    def get(self, request, public_id):
        membership, nomination = scoped_nomination(request, public_id)
        try:
            bdn = BunkerDeliveryNote.objects.get(nomination=nomination, organization=membership.organization, status=BunkerDeliveryNote.Status.ISSUED)
        except BunkerDeliveryNote.DoesNotExist:
            raise ValidationError({"bdn": "Only an issued BDN can be exported."})
        def formatted(moment):
            return moment.strftime("%d %b %Y, %H:%M UTC") if moment else "Not recorded"

        document = render_bdn_pdf({
            "bdn_number": bdn.number,
            "nomination": nomination.reference,
            "supplier": membership.organization.name,
            "customer": nomination.customer_name,
            "vessel": nomination.vessel_name,
            "imo_number": nomination.imo_number or "Not provided",
            "location": nomination.port,
            "product_grade": nomination.product_grade,
            "delivered_quantity": f"{bdn.delivered_quantity_mt} MT",
            "flashpoint": f"{bdn.flashpoint_c} C",
            "viscosity": f"{bdn.viscosity_cst} cSt",
            "sulphur": f"{bdn.sulphur_percent}% m/m",
            "water": f"{bdn.water_percent}%",
            "supplier_acknowledged_by": bdn.supplier_acknowledged_by,
            "supplier_acknowledged_at": formatted(bdn.supplier_acknowledged_at),
            "receiver_acknowledged_by": bdn.receiver_acknowledged_by,
            "receiver_acknowledged_at": formatted(bdn.receiver_acknowledged_at),
            "approved_by": bdn.approved_by.email if bdn.approved_by else "Not recorded",
            "issued_by": bdn.issued_by.email if bdn.issued_by else "Not recorded",
            "issued_at": formatted(bdn.issued_at),
            "record_id": str(bdn.public_id),
        })
        audit(nomination=nomination, actor=request.user, action="export_bdn", metadata={"format": "pdf"})
        return FileResponse(io.BytesIO(document), as_attachment=True, filename=f"{bdn.number}.pdf", content_type="application/pdf")


class BunkerDashboardView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        queryset = Nomination.objects.filter(organization=membership.organization)
        aggregates = queryset.aggregate(active=Count("id", filter=~Q(status__in=(Nomination.Status.ISSUED, Nomination.Status.CANCELLED))), nominated=Sum("nominated_quantity_mt"))
        issued = BunkerDeliveryNote.objects.filter(organization=membership.organization, status=BunkerDeliveryNote.Status.ISSUED).aggregate(count=Count("id"), delivered=Sum("delivered_quantity_mt"))
        return Response({
            "active_stems": aggregates["active"] or 0,
            "nominated_quantity_mt": aggregates["nominated"] or 0,
            "issued_bdns": issued["count"] or 0,
            "delivered_quantity_mt": issued["delivered"] or 0,
        })
