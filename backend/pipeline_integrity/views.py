import uuid

from django.db import IntegrityError, transaction
from django.db.models import Q
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from organizations.context import resolve_membership

from .models import CPSurveyPoint, Hydrotest, InspectionRecord, PigRun, PipelineAsset, ROWObservation
from .permissions import can_write
from .serializers import (
    AssetSerializer, CPSurveyPointSerializer, HydrotestSerializer, InspectionRecordSerializer, PigRunSerializer,
    PipelineAuditSerializer, ROWObservationSerializer, TransitionSerializer,
)
from .services import audit, transition_hydrotest, transition_pig


class PipelinePagination(PageNumberPagination):
    page_size = 20
    max_page_size = 100
    page_size_query_param = "page_size"


def asset_for_membership(membership, public_id):
    try:
        return PipelineAsset.objects.get(organization=membership.organization, public_id=public_id)
    except (PipelineAsset.DoesNotExist, ValueError):
        raise NotFound("Pipeline asset not found.")


def scoped_record(model, membership, public_id):
    try:
        return model.objects.select_related("asset").prefetch_related("audit_events__actor").get(organization=membership.organization, public_id=public_id)
    except (model.DoesNotExist, ValueError):
        raise NotFound("Pipeline record not found.")


class AssetListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        queryset = PipelineAsset.objects.filter(organization=membership.organization)
        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(Q(reference__icontains=search) | Q(name__icontains=search))
        paginator = PipelinePagination()
        page = paginator.paginate_queryset(queryset, request)
        return paginator.get_paginated_response(AssetSerializer(page, many=True).data)

    @transaction.atomic
    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot create pipeline assets.")
        serializer = AssetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            asset = serializer.save(organization=membership.organization)
        except IntegrityError:
            raise ValidationError({"reference": "This asset reference is already in use."})
        audit(organization=membership.organization, actor=request.user, action="create_asset", asset=asset)
        return Response(AssetSerializer(asset).data, status=status.HTTP_201_CREATED)


class PigRunListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        queryset = PigRun.objects.filter(organization=membership.organization).select_related("asset")
        search = request.query_params.get("search", "").strip()
        status_filter = request.query_params.get("status", "").strip()
        if search:
            queryset = queryset.filter(Q(reference__icontains=search) | Q(pig_type__icontains=search) | Q(asset__name__icontains=search))
        if status_filter:
            if status_filter not in PigRun.Status.values:
                raise ValidationError({"status": "Unknown pig-run status."})
            queryset = queryset.filter(status=status_filter)
        paginator = PipelinePagination()
        page = paginator.paginate_queryset(queryset, request)
        return paginator.get_paginated_response(PigRunSerializer(page, many=True, context={"membership": membership}).data)

    @transaction.atomic
    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot create pig runs.")
        serializer = PigRunSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        asset = asset_for_membership(membership, serializer.validated_data.pop("asset_id"))
        reference = serializer.validated_data.pop("reference", "") or f"PIG-{uuid.uuid4().hex[:10].upper()}"
        try:
            pig_run = serializer.save(organization=membership.organization, asset=asset, reference=reference, created_by=request.user, updated_by=request.user)
        except IntegrityError:
            raise ValidationError({"reference": "This pig-run reference is already in use."})
        audit(organization=membership.organization, actor=request.user, action="create_pig_run", asset=asset, pig_run=pig_run, to_status=pig_run.status)
        return Response(PigRunSerializer(pig_run, context={"membership": membership}).data, status=status.HTTP_201_CREATED)


class HydrotestListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        queryset = Hydrotest.objects.filter(organization=membership.organization).select_related("asset")
        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(Q(reference__icontains=search) | Q(asset__name__icontains=search))
        paginator = PipelinePagination()
        page = paginator.paginate_queryset(queryset, request)
        return paginator.get_paginated_response(HydrotestSerializer(page, many=True, context={"membership": membership}).data)

    @transaction.atomic
    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot create hydrotests.")
        serializer = HydrotestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        asset = asset_for_membership(membership, serializer.validated_data.pop("asset_id"))
        reference = serializer.validated_data.pop("reference", "") or f"HT-{uuid.uuid4().hex[:10].upper()}"
        try:
            hydrotest = serializer.save(organization=membership.organization, asset=asset, reference=reference, created_by=request.user, updated_by=request.user)
        except IntegrityError:
            raise ValidationError({"reference": "This hydrotest reference is already in use."})
        audit(organization=membership.organization, actor=request.user, action="create_hydrotest", asset=asset, hydrotest=hydrotest, to_status=hydrotest.status)
        return Response(HydrotestSerializer(hydrotest, context={"membership": membership}).data, status=status.HTTP_201_CREATED)


class PipelineDetailView(APIView):
    model = None

    def get(self, request, public_id):
        membership = resolve_membership(request)
        record = scoped_record(self.model, membership, public_id)
        data = (PigRunSerializer if self.model is PigRun else HydrotestSerializer)(record, context={"membership": membership}).data
        data["audit_events"] = PipelineAuditSerializer(record.audit_events.all(), many=True).data
        return Response(data)


class PigRunDetailView(PipelineDetailView):
    model = PigRun


class HydrotestDetailView(PipelineDetailView):
    model = Hydrotest


class PigRunTransitionView(APIView):
    def post(self, request, public_id, action):
        membership = resolve_membership(request)
        pig_run = scoped_record(PigRun, membership, public_id)
        serializer = TransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = transition_pig(pig_run=pig_run, membership=membership, action=action, **serializer.validated_data)
        return Response(PigRunSerializer(updated, context={"membership": membership}).data)


class HydrotestTransitionView(APIView):
    def post(self, request, public_id, action):
        membership = resolve_membership(request)
        hydrotest = scoped_record(Hydrotest, membership, public_id)
        serializer = TransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = transition_hydrotest(hydrotest=hydrotest, membership=membership, action=action, **serializer.validated_data)
        return Response(HydrotestSerializer(updated, context={"membership": membership}).data)


class EvidenceListCreateView(APIView):
    model = None
    serializer_class = None
    audit_action = None
    search_fields = ()
    filter_field = None
    filter_choices = ()

    def get(self, request):
        membership = resolve_membership(request)
        queryset = self.model.objects.filter(organization=membership.organization).select_related("asset")
        search = request.query_params.get("search", "").strip()
        if search:
            query = Q(reference__icontains=search) | Q(asset__reference__icontains=search) | Q(asset__name__icontains=search)
            for field in self.search_fields:
                query |= Q(**{f"{field}__icontains": search})
            queryset = queryset.filter(query)
        if self.filter_field:
            value = request.query_params.get(self.filter_field, "").strip()
            if value:
                if self.filter_choices and value not in self.filter_choices:
                    raise ValidationError({self.filter_field: f"Unknown {self.filter_field}."})
                queryset = queryset.filter(**{self.filter_field: value})
        paginator = PipelinePagination()
        page = paginator.paginate_queryset(queryset, request)
        return paginator.get_paginated_response(self.serializer_class(page, many=True).data)

    @transaction.atomic
    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot create this pipeline record.")
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        asset = asset_for_membership(membership, serializer.validated_data.pop("asset_id"))
        reference = serializer.validated_data.pop("reference", "") or f"{self.model.__name__.upper()[:3]}-{uuid.uuid4().hex[:10].upper()}"
        try:
            record = serializer.save(organization=membership.organization, asset=asset, reference=reference, created_by=request.user)
        except IntegrityError:
            raise ValidationError({"reference": "This record reference is already in use."})
        audit(organization=membership.organization, actor=request.user, action=self.audit_action, asset=asset)
        return Response(self.serializer_class(record).data, status=status.HTTP_201_CREATED)


class InspectionListCreateView(EvidenceListCreateView):
    model = InspectionRecord
    serializer_class = InspectionRecordSerializer
    audit_action = "create_inspection"
    search_fields = ("subject_reference", "inspection_type")
    filter_field = "result"
    filter_choices = InspectionRecord.Result.values


class CPSurveyPointListCreateView(EvidenceListCreateView):
    model = CPSurveyPoint
    serializer_class = CPSurveyPointSerializer
    audit_action = "create_cp_survey_point"
    search_fields = ("electrode", "surveyor_name")


class ROWObservationListCreateView(EvidenceListCreateView):
    model = ROWObservation
    serializer_class = ROWObservationSerializer
    audit_action = "create_row_observation"
    search_fields = ("category", "observer_name", "description")
    filter_field = "status"
    filter_choices = ROWObservation.Status.values
