from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from client_portal.models import (
    ClientPortalAccessLog,
    ClientPortalProfile,
    SharedDeliverablePackage,
)
from client_portal.permissions import can_manage_client_portal, resolve_client_profile
from client_portal.serializers import (
    ClientPortalAccessLogSerializer,
    ClientPortalProfileSerializer,
    CreateClientProfileRequestSerializer,
    SharedDeliverablePackageSerializer,
    SharePackageRequestSerializer,
)
from client_portal.services import ClientPortalService
from organizations.context import resolve_membership

User = get_user_model()


class StandardPagination(PageNumberPagination):
    page_size = 20
    max_page_size = 100
    page_size_query_param = "page_size"


def get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def get_user_agent(request):
    return request.META.get("HTTP_USER_AGENT", "")[:255]


class ClientPortalSummaryView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        profile = resolve_client_profile(request.user, membership.organization)

        qs = SharedDeliverablePackage.objects.filter(organization=membership.organization)
        if profile:
            qs = qs.filter(client_name=profile.client_name)

        total_deliverables = qs.count()
        by_type = dict(qs.values("deliverable_type").annotate(count=Count("id")).values_list("deliverable_type", "count"))

        access_qs = ClientPortalAccessLog.objects.filter(organization=membership.organization)
        if profile:
            access_qs = access_qs.filter(client_name=profile.client_name)
        total_accesses = access_qs.count()

        profiles_count = ClientPortalProfile.objects.filter(organization=membership.organization, is_active=True).count()

        return Response({
            "is_client_user": profile is not None,
            "client_name": profile.client_name if profile else None,
            "total_deliverables": total_deliverables,
            "total_access_events": total_accesses,
            "active_client_profiles": profiles_count,
            "deliverables_by_type": by_type,
        })


class ClientPortalFeedView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        profile = resolve_client_profile(request.user, membership.organization)

        qs = SharedDeliverablePackage.objects.filter(organization=membership.organization)
        if profile:
            qs = qs.filter(client_name=profile.client_name)
        else:
            client_name = request.query_params.get("client_name")
            if client_name:
                qs = qs.filter(client_name=client_name)

        deliv_type = request.query_params.get("deliverable_type")
        if deliv_type:
            qs = qs.filter(deliverable_type=deliv_type)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(source_reference__icontains=search))

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = SharedDeliverablePackageSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class SharedDeliverablePackageDetailView(APIView):
    def get(self, request, public_id):
        membership = resolve_membership(request)
        profile = resolve_client_profile(request.user, membership.organization)

        try:
            package = SharedDeliverablePackage.objects.get(
                organization=membership.organization, public_id=public_id
            )
        except SharedDeliverablePackage.DoesNotExist:
            raise NotFound("Shared deliverable package not found.")

        if profile and package.client_name != profile.client_name:
            raise PermissionDenied("You do not have access to this deliverable package.")

        # Log access
        ClientPortalService.log_access(
            organization=membership.organization,
            user=request.user,
            client_name=profile.client_name if profile else f"Internal:{request.user.username}",
            action="VIEW_DELIVERABLE",
            resource_type="SharedDeliverablePackage",
            resource_reference=package.source_reference,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            metadata={"package_id": str(package.public_id), "title": package.title},
        )

        serializer = SharedDeliverablePackageSerializer(package)
        return Response(serializer.data)


class SharedDeliverablePackageVerifyView(APIView):
    def get(self, request, public_id):
        membership = resolve_membership(request)
        profile = resolve_client_profile(request.user, membership.organization)

        try:
            package = SharedDeliverablePackage.objects.get(
                organization=membership.organization, public_id=public_id
            )
        except SharedDeliverablePackage.DoesNotExist:
            raise NotFound("Shared deliverable package not found.")

        if profile and package.client_name != profile.client_name:
            raise PermissionDenied("You do not have access to this deliverable package.")

        expected_seal = package.generate_seal()
        is_valid = expected_seal == package.verification_seal

        ClientPortalService.log_access(
            organization=membership.organization,
            user=request.user,
            client_name=profile.client_name if profile else f"Internal:{request.user.username}",
            action="VERIFY_SEAL",
            resource_type="SharedDeliverablePackage",
            resource_reference=package.source_reference,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            metadata={"verified": is_valid, "seal": package.verification_seal},
        )

        return Response({
            "public_id": package.public_id,
            "source_reference": package.source_reference,
            "verification_seal": package.verification_seal,
            "is_valid": is_valid,
            "verified_at": package.created_at,
        })


class SharedDeliverablePackageListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = SharedDeliverablePackage.objects.filter(organization=membership.organization)

        client_name = request.query_params.get("client_name")
        if client_name:
            qs = qs.filter(client_name=client_name)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = SharedDeliverablePackageSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        serializer = SharePackageRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        package = ClientPortalService.share_deliverable_package(
            organization=membership.organization,
            user=request.user,
            client_name=serializer.validated_data["client_name"],
            title=serializer.validated_data["title"],
            deliverable_type=serializer.validated_data["deliverable_type"],
            source_reference=serializer.validated_data["source_reference"],
            summary_metadata=serializer.validated_data.get("summary_metadata", {}),
            expires_at=serializer.validated_data.get("expires_at"),
        )
        return Response(SharedDeliverablePackageSerializer(package).data, status=status.HTTP_201_CREATED)


class ClientPortalProfileListCreateView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        qs = ClientPortalProfile.objects.filter(organization=membership.organization).select_related("user")
        serializer = ClientPortalProfileSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        membership = resolve_membership(request)
        if not can_manage_client_portal(membership):
            raise PermissionDenied("Only organization owners and admins can configure client portal profiles.")

        serializer = CreateClientProfileRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            target_user = User.objects.get(id=serializer.validated_data["target_user_id"])
        except User.DoesNotExist:
            raise NotFound("Target user not found.")

        profile = ClientPortalService.create_client_profile(
            organization=membership.organization,
            user=request.user,
            target_user=target_user,
            client_name=serializer.validated_data["client_name"],
            client_customer_code=serializer.validated_data.get("client_customer_code", ""),
            allowed_modules=serializer.validated_data.get("allowed_modules"),
        )
        return Response(ClientPortalProfileSerializer(profile).data, status=status.HTTP_201_CREATED)


class ClientPortalProfileDetailView(APIView):
    def patch(self, request, public_id):
        membership = resolve_membership(request)
        if not can_manage_client_portal(membership):
            raise PermissionDenied("Only organization owners and admins can update client portal profiles.")

        try:
            profile = ClientPortalProfile.objects.get(organization=membership.organization, public_id=public_id)
        except ClientPortalProfile.DoesNotExist:
            raise NotFound("Client portal profile not found.")

        if "is_active" in request.data:
            profile.is_active = bool(request.data["is_active"])
        if "client_name" in request.data:
            profile.client_name = request.data["client_name"]
        if "allowed_modules" in request.data:
            profile.allowed_modules = request.data["allowed_modules"]
        profile.save()

        return Response(ClientPortalProfileSerializer(profile).data)


class ClientPortalAuditLogView(APIView):
    def get(self, request):
        membership = resolve_membership(request)
        profile = resolve_client_profile(request.user, membership.organization)

        qs = ClientPortalAccessLog.objects.filter(organization=membership.organization).select_related("client_user")
        if profile:
            qs = qs.filter(client_name=profile.client_name)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = ClientPortalAccessLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
