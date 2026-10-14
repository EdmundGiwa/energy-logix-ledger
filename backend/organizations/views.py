from rest_framework.generics import ListAPIView
from rest_framework.filters import SearchFilter
from rest_framework.permissions import IsAuthenticated

from .models import Membership
from .permissions import HasActiveOrganizationMembership
from .serializers import MembershipSerializer


class CurrentOrganizationMembersView(ListAPIView):
    permission_classes = (IsAuthenticated, HasActiveOrganizationMembership)
    serializer_class = MembershipSerializer
    filter_backends = (SearchFilter,)
    search_fields = ("user__email", "user__first_name", "user__last_name", "job_title")

    def get_queryset(self):
        return Membership.objects.select_related("user", "organization").filter(
            organization=self.request.organization,
        )
