from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q, Sum
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from epc_link.models import (
    ApprovedVendor,
    MaterialIssueSlip,
    MaterialRequisition,
    PipeYardItem,
)
from epc_link.permissions import can_approve, can_write
from epc_link.serializers import (
    ApprovedVendorSerializer,
    MaterialIssueSlipSerializer,
    MaterialRequisitionSerializer,
    PipeYardItemSerializer,
)
from epc_link.services import ConflictError, EpcLinkService
from organizations.context import resolve_membership


class StandardPagination(PageNumberPagination):
    page_size = 20
    max_page_size = 100
    page_size_query_param = "page_size"


def get_scoped_vendor(membership, public_id):
    try:
        return ApprovedVendor.objects.get(organization=membership.organization, public_id=public_id)
    except ApprovedVendor.DoesNotExist:
        raise NotFound("Approved vendor not found.")


def get_scoped_requisition(membership, public_id):
    try:
        return MaterialRequisition.objects.select_related("requested_by", "approved_by").get(
            organization=membership.organization, public_id=public_id
        )
    except MaterialRequisition.DoesNotExist:
        raise NotFound("Material requisition not found.")


def get_scoped_yard_item(membership, public_id):
    try:
        return PipeYardItem.objects.select_related("vendor", "reservation").get(
            organization=membership.organization, public_id=public_id
        )
    except PipeYardItem.DoesNotExist:
        raise NotFound("Pipe-yard item not found.")


class EpcLinkSummaryView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        org = membership.organization

        yard_items = PipeYardItem.objects.filter(organization=org)
        total_yard_items = yard_items.count()
        available_yard_items = yard_items.filter(status=PipeYardItem.Status.AVAILABLE).count()
        reserved_yard_items = yard_items.filter(status=PipeYardItem.Status.RESERVED).count()

        requisitions = MaterialRequisition.objects.filter(organization=org)
        total_requisitions = requisitions.count()
        pending_requisitions = requisitions.filter(status=MaterialRequisition.Status.SUBMITTED).count()
        approved_requisitions = requisitions.filter(status=MaterialRequisition.Status.APPROVED).count()

        vendors = ApprovedVendor.objects.filter(organization=org)
        total_vendors = vendors.count()
        active_vendors = vendors.filter(status=ApprovedVendor.Status.ACTIVE).count()

        issue_slips = MaterialIssueSlip.objects.filter(organization=org)
        total_issue_slips = issue_slips.count()

        # NC calculation
        report = EpcLinkService.generate_nigerian_content_report(organization=org)
        overall_nc_percent = report["inventory_summary"]["overall_nigerian_content_percent"]

        return Response({
            "total_yard_items": total_yard_items,
            "available_yard_items": available_yard_items,
            "reserved_yard_items": reserved_yard_items,
            "total_requisitions": total_requisitions,
            "pending_requisitions": pending_requisitions,
            "approved_requisitions": approved_requisitions,
            "total_vendors": total_vendors,
            "active_vendors": active_vendors,
            "total_issue_slips": total_issue_slips,
            "overall_nigerian_content_percent": overall_nc_percent,
        })


class ApprovedVendorListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = ApprovedVendor.objects.filter(organization=membership.organization)

        category = request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)

        status_param = request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(vendor_code__icontains=search)
                | Q(vendor_name__icontains=search)
                | Q(nogic_jqs_id__icontains=search)
            )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = ApprovedVendorSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized staff can register vendors.")

        try:
            vendor = EpcLinkService.create_vendor(
                organization=membership.organization,
                user=request.user,
                data=request.data,
            )
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))
        except KeyError as exc:
            raise ValidationError(f"Missing required field: {exc}")

        return Response(ApprovedVendorSerializer(vendor).data, status=status.HTTP_201_CREATED)


class ApprovedVendorDetailView(APIView):
    def get(self, request, public_id):
        membership = resolve_membership(request)
        vendor = get_scoped_vendor(membership, public_id)
        return Response(ApprovedVendorSerializer(vendor).data)

    def patch(self, request, public_id):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized staff can update vendors.")

        vendor = get_scoped_vendor(membership, public_id)
        serializer = ApprovedVendorSerializer(vendor, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(ApprovedVendorSerializer(updated).data)


class MaterialRequisitionListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = MaterialRequisition.objects.filter(organization=membership.organization).select_related(
            "requested_by", "approved_by"
        )

        status_param = request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        priority = request.query_params.get("priority")
        if priority:
            qs = qs.filter(priority=priority)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(requisition_number__icontains=search)
                | Q(project_name__icontains=search)
                | Q(client_name__icontains=search)
                | Q(wbs_code__icontains=search)
            )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = MaterialRequisitionSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized staff can create material requisitions.")

        try:
            requisition = EpcLinkService.create_requisition(
                organization=membership.organization,
                user=request.user,
                data=request.data,
            )
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))
        except KeyError as exc:
            raise ValidationError(f"Missing required field: {exc}")

        return Response(MaterialRequisitionSerializer(requisition).data, status=status.HTTP_201_CREATED)


class MaterialRequisitionDetailView(APIView):
    def get(self, request, public_id):
        membership = resolve_membership(request)
        requisition = get_scoped_requisition(membership, public_id)
        return Response(MaterialRequisitionSerializer(requisition).data)

    def patch(self, request, public_id):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized staff can edit requisitions.")

        requisition = get_scoped_requisition(membership, public_id)
        serializer = MaterialRequisitionSerializer(requisition, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(MaterialRequisitionSerializer(updated).data)


class MaterialRequisitionTransitionView(APIView):
    def post(self, request, public_id, action):
        membership = resolve_membership(request)
        requisition = get_scoped_requisition(membership, public_id)

        if action in ("approve", "reject") and not can_approve(membership):
            raise PermissionDenied("Only authorized project managers can approve or reject material requisitions.")

        version = request.data.get("version")
        if version is None:
            raise ValidationError({"version": "Current requisition version is required."})

        reason = request.data.get("reason", "")

        try:
            updated = EpcLinkService.transition_requisition(
                organization=membership.organization,
                user=request.user,
                requisition=requisition,
                action=action,
                version=int(version),
                reason=reason,
            )
        except ConflictError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))

        return Response(MaterialRequisitionSerializer(updated).data)


class PipeYardItemListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = PipeYardItem.objects.filter(organization=membership.organization).select_related(
            "vendor", "reservation"
        )

        material_type = request.query_params.get("material_type")
        if material_type:
            qs = qs.filter(material_type=material_type)

        status_param = request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        heat_number = request.query_params.get("heat_number")
        if heat_number:
            qs = qs.filter(heat_number__icontains=heat_number)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(item_tag__icontains=search)
                | Q(grade_specification__icontains=search)
                | Q(heat_number__icontains=search)
                | Q(mtc_number__icontains=search)
                | Q(qr_tag__icontains=search)
            )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = PipeYardItemSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized yard personnel can intake pipe-yard items.")

        try:
            item = EpcLinkService.create_yard_item(
                organization=membership.organization,
                user=request.user,
                data=request.data,
            )
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))
        except KeyError as exc:
            raise ValidationError(f"Missing required field: {exc}")

        return Response(PipeYardItemSerializer(item).data, status=status.HTTP_201_CREATED)


class PipeYardItemDetailView(APIView):
    def get(self, request, public_id):
        membership = resolve_membership(request)
        item = get_scoped_yard_item(membership, public_id)
        return Response(PipeYardItemSerializer(item).data)

    def patch(self, request, public_id):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized yard personnel can modify yard items.")

        item = get_scoped_yard_item(membership, public_id)
        serializer = PipeYardItemSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(PipeYardItemSerializer(updated).data)


class MaterialIssueSlipListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = MaterialIssueSlip.objects.filter(organization=membership.organization).select_related(
            "requisition", "issued_by"
        ).prefetch_related("items__yard_item")

        requisition_id = request.query_params.get("requisition_id")
        if requisition_id:
            qs = qs.filter(requisition__public_id=requisition_id)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = MaterialIssueSlipSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_write(membership):
            raise PermissionDenied("Only authorized storekeepers can issue materials.")

        req_id = request.data.get("requisition_id")
        if not req_id:
            raise ValidationError({"requisition_id": "requisition_id is required."})

        requisition = get_scoped_requisition(membership, req_id)

        try:
            issue_slip = EpcLinkService.issue_materials(
                organization=membership.organization,
                user=request.user,
                requisition=requisition,
                data=request.data,
            )
        except DjangoValidationError as exc:
            raise ValidationError(str(exc))
        except KeyError as exc:
            raise ValidationError(f"Missing required field: {exc}")

        return Response(MaterialIssueSlipSerializer(issue_slip).data, status=status.HTTP_201_CREATED)


class NigerianContentReportView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        report = EpcLinkService.generate_nigerian_content_report(organization=membership.organization)
        return Response(report)
