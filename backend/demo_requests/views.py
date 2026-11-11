from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import DemoRequestCreateSerializer, DemoRequestReceiptSerializer
from .services import SlotUnavailable, booking_config, create_demo_request, list_available_slots


class DemoAvailabilityView(APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)

    def get(self, request):
        config = booking_config()
        return Response(
            {
                "timezone": config.timezone.key,
                "duration_minutes": config.duration_minutes,
                "slots": [slot.isoformat().replace("+00:00", "Z") for slot in list_available_slots()],
            }
        )


@method_decorator(csrf_protect, name="dispatch")
class DemoRequestCreateView(APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)
    throttle_scope = "demo_request"

    def post(self, request):
        serializer = DemoRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = create_demo_request(data=serializer.validated_data)
        except SlotUnavailable as exc:
            return Response({"scheduled_start": [str(exc)]}, status=status.HTTP_409_CONFLICT)
        return Response(
            DemoRequestReceiptSerializer(result.demo_request).data,
            status=status.HTTP_201_CREATED if result.created else status.HTTP_200_OK,
        )
