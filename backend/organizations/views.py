from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.filters import SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Membership, ModuleAccessRequest
from .permissions import HasActiveOrganizationMembership
from .serializers import MembershipSerializer, ModuleAccessRequestCreateSerializer, ModuleAccessRequestSerializer
from .services import request_module_access


class CurrentOrganizationMembersView(ListAPIView):
    permission_classes = (IsAuthenticated, HasActiveOrganizationMembership)
    serializer_class = MembershipSerializer
    filter_backends = (SearchFilter,)
    search_fields = ("user__email", "user__first_name", "user__last_name", "job_title")

    def get_queryset(self):
        return Membership.objects.select_related("user", "organization").filter(
            organization=self.request.organization,
        )


class ModuleAccessRequestsView(ListAPIView):
    """List the organization's module requests, or ask Offshora to switch a module on."""

    permission_classes = (IsAuthenticated, HasActiveOrganizationMembership)
    serializer_class = ModuleAccessRequestSerializer
    pagination_class = None
    def get_throttles(self):
        # Only creating requests is rate-limited; the dashboard reads this list on every load.
        self.throttle_scope = "module_request" if self.request.method == "POST" else None
        return super().get_throttles()

    def get_queryset(self):
        return ModuleAccessRequest.objects.filter(organization=self.request.organization)

    def post(self, request):
        serializer = ModuleAccessRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = request_module_access(membership=request.membership, **serializer.validated_data)
        return Response(
            ModuleAccessRequestSerializer(result.access_request).data,
            status=status.HTTP_201_CREATED if result.created else status.HTTP_200_OK,
        )
