from datetime import date, timedelta
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from compliance_shield.models import (
    AuditNonConformance,
    ComplianceEvidencePack,
    IsoManagementSystemAudit,
    RegulatoryCertificate,
)
from compliance_shield.permissions import can_approve, can_write
from compliance_shield.serializers import (
    AuditNonConformanceSerializer,
    ComplianceEvidencePackSerializer,
    IsoManagementSystemAuditSerializer,
    RegulatoryCertificateSerializer,
)
from compliance_shield.services import ComplianceService, ConflictError
from organizations.context import resolve_membership


class StandardPagination(PageNumberPagination):
    page_size = 20
    max_page_size = 100
    page_size_query_param = "page_size"


def get_scoped_certificate(membership, public_id):
    try:
        return RegulatoryCertificate.objects.select_related("verified_by").get(
            organization=membership.organization, public_id=public_id
        )
    except RegulatoryCertificate.DoesNotExist:
        raise NotFound("Regulatory certificate not found.")


def get_scoped_audit(membership, public_id):
    try:
        return IsoManagementSystemAudit.objects.prefetch_related("ncrs").get(
            organization=membership.organization, public_id=public_id
        )
    except IsoManagementSystemAudit.DoesNotExist:
        raise NotFound("ISO audit record not found.")


def get_scoped_ncr(membership, public_id):
    try:
        return AuditNonConformance.objects.select_related("audit").get(
            organization=membership.organization, public_id=public_id
        )
    except AuditNonConformance.DoesNotExist:
        raise NotFound("Audit non-conformance not found.")


class ComplianceSummaryView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        org = membership.organization
        today = date.today()

        certs = RegulatoryCertificate.objects.filter(organization=org)
        total_certificates = certs.count()
        valid_certificates = certs.filter(status=RegulatoryCertificate.Status.VALID).count()
        expiring_soon_certificates = certs.filter(status=RegulatoryCertificate.Status.EXPIRING_SOON).count()
        expired_certificates = certs.filter(status=RegulatoryCertificate.Status.EXPIRED).count()
        renewal_pending = certs.filter(status=RegulatoryCertificate.Status.RENEWAL_IN_PROGRESS).count()

        # Urgency alerts by exact day thresholds
        critical_7d = certs.filter(expiry_date__gte=today, expiry_date__lte=today + timedelta(days=7)).count()
        warning_30d = certs.filter(expiry_date__gt=today + timedelta(days=7), expiry_date__lte=today + timedelta(days=30)).count()
        notice_60d = certs.filter(expiry_date__gt=today + timedelta(days=30), expiry_date__lte=today + timedelta(days=60)).count()
        upcoming_90d = certs.filter(expiry_date__gt=today + timedelta(days=60), expiry_date__lte=today + timedelta(days=90)).count()

        audits = IsoManagementSystemAudit.objects.filter(organization=org)
        total_iso_audits = audits.count()
        open_ncrs_count = AuditNonConformance.objects.filter(
            organization=org, status__in=[AuditNonConformance.Status.OPEN, AuditNonConformance.Status.IN_PROGRESS]
        ).count()

        total_evidence_packs = ComplianceEvidencePack.objects.filter(organization=org).count()

        return Response({
            "total_certificates": total_certificates,
            "valid_certificates": valid_certificates,
            "expiring_soon_certificates": expiring_soon_certificates,
            "expired_certificates": expired_certificates,
            "renewal_pending_certificates": renewal_pending,
            "critical_alerts_7d": critical_7d,
            "warning_alerts_30d": warning_30d,
            "notice_alerts_60d": notice_60d,
            "upcoming_alerts_90d": upcoming_90d,
            "total_iso_audits": total_iso_audits,
            "open_ncrs_count": open_ncrs_count,
            "total_evidence_packs": total_evidence_packs,
        })


class RegulatoryCertificateListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = RegulatoryCertificate.objects.filter(organization=membership.organization).select_related("verified_by")

        regulator = request.query_params.get("regulator")
        if regulator:
            qs = qs.filter(regulator=regulator)

        status_param = request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(certificate_number__icontains=search)
                | Q(certificate_type__icontains=search)
                | Q(issuing_authority__icontains=search)
            )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = RegulatoryCertificateSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized compliance staff can register certificates.")

        try:
            cert = ComplianceService.create_certificate(
                organization=membership.organization,
                user=request.user,
                data=request.data,
            )
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))
        except KeyError as exc:
            raise ValidationError(f"Missing required field: {exc}")

        return Response(RegulatoryCertificateSerializer(cert).data, status=status.HTTP_201_CREATED)


class RegulatoryCertificateDetailView(APIView):
    def get(self, request, public_id):
        membership = resolve_membership(request)
        cert = get_scoped_certificate(membership, public_id)
        return Response(RegulatoryCertificateSerializer(cert).data)

    def patch(self, request, public_id):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized compliance staff can update certificates.")

        cert = get_scoped_certificate(membership, public_id)
        version = request.data.get("version")
        if version is None:
            raise ValidationError({"version": "Current certificate version is required."})

        try:
            updated = ComplianceService.update_certificate(
                organization=membership.organization,
                user=request.user,
                cert=cert,
                data=request.data,
                version=int(version),
            )
        except ConflictError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))

        return Response(RegulatoryCertificateSerializer(updated).data)


class RegulatoryCertificateActionView(APIView):
    def post(self, request, public_id, action):
        membership = resolve_membership(request)
        cert = get_scoped_certificate(membership, public_id)

        if action == "submit_renewal":
            tracking_number = request.data.get("renewal_tracking_number")
            if not tracking_number:
                raise ValidationError({"renewal_tracking_number": "Tracking number is required."})
            updated = ComplianceService.record_renewal_submission(
                organization=membership.organization,
                user=request.user,
                cert=cert,
                tracking_number=tracking_number,
                reason=request.data.get("reason", ""),
            )
            return Response(RegulatoryCertificateSerializer(updated).data)

        elif action == "verify":
            if not can_approve(membership):
                raise PermissionDenied("Only compliance managers can formally verify statutory certificates.")
            new_expiry = request.data.get("new_expiry_date")
            updated = ComplianceService.verify_certificate(
                organization=membership.organization,
                user=request.user,
                cert=cert,
                new_expiry_date=new_expiry,
                reason=request.data.get("reason", ""),
            )
            return Response(RegulatoryCertificateSerializer(updated).data)

        else:
            raise ValidationError(f"Unknown action '{action}'.")


class IsoManagementSystemAuditListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = IsoManagementSystemAudit.objects.filter(organization=membership.organization).prefetch_related("ncrs")

        standard = request.query_params.get("standard")
        if standard:
            qs = qs.filter(standard=standard)

        audit_type = request.query_params.get("audit_type")
        if audit_type:
            qs = qs.filter(audit_type=audit_type)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = IsoManagementSystemAuditSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized auditors can log ISO audits.")

        try:
            audit = ComplianceService.create_iso_audit(
                organization=membership.organization,
                user=request.user,
                data=request.data,
            )
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))
        except KeyError as exc:
            raise ValidationError(f"Missing required field: {exc}")

        return Response(IsoManagementSystemAuditSerializer(audit).data, status=status.HTTP_201_CREATED)


class AuditNonConformanceListCreateView(APIView):
    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized staff can log non-conformances.")

        audit_id = request.data.get("audit_id")
        if not audit_id:
            raise ValidationError({"audit_id": "audit_id is required."})

        audit = get_scoped_audit(membership, audit_id)

        try:
            ncr = ComplianceService.log_ncr(
                organization=membership.organization,
                user=request.user,
                audit=audit,
                data=request.data,
            )
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))
        except KeyError as exc:
            raise ValidationError(f"Missing required field: {exc}")

        return Response(AuditNonConformanceSerializer(ncr).data, status=status.HTTP_201_CREATED)


class AuditNonConformanceCloseView(APIView):
    def post(self, request, public_id):
        membership = resolve_membership(request)
        if not can_approve(membership):
            raise PermissionDenied("Only QA/QC managers can close audit non-conformances.")

        ncr = get_scoped_ncr(membership, public_id)
        reason = request.data.get("reason", "")

        closed = ComplianceService.close_ncr(
            organization=membership.organization,
            user=request.user,
            ncr=ncr,
            reason=reason,
        )
        return Response(AuditNonConformanceSerializer(closed).data)


class ComplianceEvidencePackListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = ComplianceEvidencePack.objects.filter(organization=membership.organization).select_related("compiled_by")

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = ComplianceEvidencePackSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized compliance staff can compile evidence packs.")

        try:
            pack = ComplianceService.compile_evidence_pack(
                organization=membership.organization,
                user=request.user,
                data=request.data,
            )
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))
        except KeyError as exc:
            raise ValidationError(f"Missing required field: {exc}")

        return Response(ComplianceEvidencePackSerializer(pack).data, status=status.HTTP_201_CREATED)
