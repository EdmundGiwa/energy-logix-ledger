from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    # Infrastructure probes must remain available independently of the public
    # API's anonymous-user rate limit.
    throttle_classes = []

    def get(self, request):
        return Response({"status": "ok"})
