import uuid

from django.db import IntegrityError
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from organizations.context import resolve_membership
from .models import Credential, Mobilization, MobilizationWorker, Permit, SafetyAcknowledgement, SafetyProcedure, Worker
from .pdf import render_permit_pdf
from .permissions import can_approve, can_write
from .serializers import AcknowledgementSerializer, CredentialSerializer, GasTestSerializer, MobilizationSerializer, PermitSerializer, SafetyProcedureSerializer, TransitionSerializer, VersionSerializer, WorkerSerializer
from .services import assess_mobilization, audit, record_gas_test, release_mobilization, transition_permit


def tenant_object(model, membership, public_id, **filters):
    try:
        return model.objects.get(organization=membership.organization, public_id=public_id, **filters)
    except (model.DoesNotExist, ValueError):
        raise NotFound("The requested SafePass record was not found.")


class SummaryView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        org = membership.organization
        today = timezone.localdate()
        return Response({
            "active_workers": Worker.objects.filter(organization=org, is_active=True).count(),
            "active_permits": Permit.objects.filter(organization=org, status__in=["approved", "active", "suspended"]).count(),
            "open_mobilizations": Mobilization.objects.filter(organization=org).exclude(status__in=["released", "cancelled"]).count(),
            "credential_alerts": Credential.objects.filter(organization=org).filter(Q(expires_on__lt=today) | ~Q(status="verified")).count(),
        })


class WorkerListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        records = Worker.objects.filter(organization=membership.organization)
        search = request.query_params.get("search", "").strip()
        if search:
            records = records.filter(Q(full_name__icontains=search) | Q(employee_number__icontains=search) | Q(job_title__icontains=search))
        return Response(WorkerSerializer(records[:200], many=True).data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot register workers.")
        serializer = WorkerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            worker = serializer.save(organization=membership.organization)
        except IntegrityError:
            raise ValidationError({"employee_number": "This employee number already exists in your organization."})
        audit(target=worker, actor=membership.user, action="create_worker")
        return Response(WorkerSerializer(worker).data, status=status.HTTP_201_CREATED)


class CredentialListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        records = Credential.objects.filter(organization=membership.organization).select_related("worker", "verified_by")
        return Response(CredentialSerializer(records[:300], many=True).data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot register credentials.")
        serializer = CredentialSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        worker = tenant_object(Worker, membership, serializer.validated_data.pop("worker_id"), is_active=True)
        credential = serializer.save(organization=membership.organization, worker=worker)
        audit(target=credential, actor=membership.user, action="create_credential")
        return Response(CredentialSerializer(credential).data, status=status.HTTP_201_CREATED)


class CredentialVerifyView(APIView):
    def post(self, request, public_id):
        membership = resolve_membership(request)
        if not can_approve(membership):
            raise PermissionDenied("Only an owner or administrator can verify credentials.")
        credential = tenant_object(Credential, membership, public_id, status=Credential.Status.PENDING)
        credential.status, credential.verified_by, credential.verified_at = Credential.Status.VERIFIED, membership.user, timezone.now()
        credential.save(update_fields=("status", "verified_by", "verified_at", "updated_at"))
        audit(target=credential, actor=membership.user, action="verify_credential")
        return Response(CredentialSerializer(credential).data)


class ProcedureListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        return Response(SafetyProcedureSerializer(SafetyProcedure.objects.filter(organization=membership.organization), many=True).data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_approve(membership):
            raise PermissionDenied("Only an owner or administrator can define safety procedures.")
        serializer = SafetyProcedureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        procedure = serializer.save(organization=membership.organization)
        audit(target=procedure, actor=membership.user, action="create_procedure")
        return Response(SafetyProcedureSerializer(procedure).data, status=status.HTTP_201_CREATED)


class ProcedureApproveView(APIView):
    def post(self, request, public_id):
        membership = resolve_membership(request)
        if not can_approve(membership):
            raise PermissionDenied("Only an owner or administrator can approve safety procedures.")
        procedure = tenant_object(SafetyProcedure, membership, public_id)
        procedure.is_approved, procedure.approved_by, procedure.approved_at = True, membership.user, timezone.now()
        procedure.save(update_fields=("is_approved", "approved_by", "approved_at", "updated_at"))
        audit(target=procedure, actor=membership.user, action="approve_procedure")
        return Response(SafetyProcedureSerializer(procedure).data)


class MobilizationListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        records = Mobilization.objects.filter(organization=membership.organization).select_related("procedure").prefetch_related("crew_entries__worker")
        return Response(MobilizationSerializer(records, many=True).data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot create mobilizations.")
        serializer = MobilizationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        procedure = tenant_object(SafetyProcedure, membership, serializer.validated_data.pop("procedure_id"))
        reference = serializer.validated_data.pop("reference", "") or f"MOB-{uuid.uuid4().hex[:10].upper()}"
        record = serializer.save(organization=membership.organization, procedure=procedure, reference=reference, created_by=membership.user)
        audit(target=record, actor=membership.user, action="create", from_status="new", to_status=record.status)
        return Response(MobilizationSerializer(record).data, status=status.HTTP_201_CREATED)


class MobilizationDetailView(APIView):
    def get(self, request, public_id):
        membership = resolve_membership(request)
        return Response(MobilizationSerializer(tenant_object(Mobilization, membership, public_id)).data)


class MobilizationCrewView(APIView):
    def post(self, request, public_id):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot update mobilizations.")
        record = tenant_object(Mobilization, membership, public_id, status__in=["draft", "blocked"])
        worker = tenant_object(Worker, membership, request.data.get("worker_id"), is_active=True)
        MobilizationWorker.objects.get_or_create(mobilization=record, worker=worker)
        audit(target=record, actor=membership.user, action="add_worker", metadata={"worker_id": str(worker.public_id)})
        return Response(MobilizationSerializer(record).data)


class MobilizationAssessView(APIView):
    def post(self, request, public_id):
        membership = resolve_membership(request)
        serializer = VersionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = tenant_object(Mobilization, membership, public_id)
        return Response(MobilizationSerializer(assess_mobilization(mobilization=record, membership=membership, **serializer.validated_data)).data)


class MobilizationReleaseView(APIView):
    def post(self, request, public_id):
        membership = resolve_membership(request)
        serializer = TransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = tenant_object(Mobilization, membership, public_id)
        return Response(MobilizationSerializer(release_mobilization(mobilization=record, membership=membership, **serializer.validated_data)).data)


class PermitListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        records = Permit.objects.filter(organization=membership.organization).select_related("procedure", "performing_authority").prefetch_related("gas_tests", "acknowledgements__worker")
        return Response(PermitSerializer(records[:200], many=True).data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot create permits.")
        serializer = PermitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        procedure = tenant_object(SafetyProcedure, membership, serializer.validated_data.pop("procedure_id"), is_approved=True)
        worker = tenant_object(Worker, membership, serializer.validated_data.pop("performing_authority_id"), is_active=True)
        reference = serializer.validated_data.pop("reference", "") or f"PTW-{uuid.uuid4().hex[:10].upper()}"
        permit = serializer.save(organization=membership.organization, procedure=procedure, performing_authority=worker, reference=reference, created_by=membership.user)
        audit(target=permit, actor=membership.user, action="create", from_status="new", to_status=permit.status)
        return Response(PermitSerializer(permit).data, status=status.HTTP_201_CREATED)


class PermitDetailView(APIView):
    def get(self, request, public_id):
        membership = resolve_membership(request)
        return Response(PermitSerializer(tenant_object(Permit, membership, public_id)).data)


class PermitGasTestView(APIView):
    def post(self, request, public_id):
        membership = resolve_membership(request)
        serializer = GasTestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reading = record_gas_test(permit=tenant_object(Permit, membership, public_id), membership=membership, data=serializer.validated_data)
        return Response(GasTestSerializer(reading).data, status=status.HTTP_201_CREATED)


class PermitAcknowledgementView(APIView):
    def post(self, request, public_id):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Your organization role cannot record safety acknowledgements.")
        permit = tenant_object(Permit, membership, public_id, status__in=["draft", "under_review"])
        serializer = AcknowledgementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        worker = tenant_object(Worker, membership, serializer.validated_data.pop("worker_id"), is_active=True)
        acknowledgement = serializer.save(organization=membership.organization, permit=permit, worker=worker)
        audit(target=permit, actor=membership.user, action="acknowledge", metadata={"kind": acknowledgement.kind, "worker_id": str(worker.public_id)})
        return Response(AcknowledgementSerializer(acknowledgement).data, status=status.HTTP_201_CREATED)


class PermitTransitionView(APIView):
    def post(self, request, public_id, action):
        membership = resolve_membership(request)
        serializer = TransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        permit = transition_permit(permit=tenant_object(Permit, membership, public_id), membership=membership, action=action, **serializer.validated_data)
        return Response(PermitSerializer(permit).data)


class PermitExportView(APIView):
    def get(self, request, public_id):
        membership = resolve_membership(request)
        permit = tenant_object(Permit, membership, public_id, status__in=["approved", "active", "suspended", "closed"])
        response = HttpResponse(render_permit_pdf(permit), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{permit.reference}.pdf"'
        audit(target=permit, actor=membership.user, action="export")
        return response
