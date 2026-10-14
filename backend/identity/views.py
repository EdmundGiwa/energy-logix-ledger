from django.contrib.auth import login as auth_login
from django.contrib.auth import logout as auth_logout
from django.db import IntegrityError
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from organizations.services import register_organization_owner
from organizations.db_context import set_tenant_actor

from .models import AuthenticationEvent
from .serializers import CurrentUserSerializer, LoginSerializer, RegistrationSerializer
from .services import record_authentication_event


def session_response(user):
    return CurrentUserSerializer(user).data


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)

    def get(self, request):
        return Response({"csrf_token": get_token(request)})


@method_decorator(csrf_protect, name="dispatch")
class RegisterView(APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)
    throttle_scope = "registration"

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        data.pop("terms_accepted")
        try:
            result = register_organization_owner(**data)
        except IntegrityError:
            return Response(
                {"email": ["An account with this email already exists."]},
                status=status.HTTP_409_CONFLICT,
            )
        auth_login(request, result.user)
        request.session.set_expiry(0)
        set_tenant_actor(user_id=result.user.pk)
        record_authentication_event(
            request=request,
            event_type=AuthenticationEvent.EventType.REGISTER,
            outcome=AuthenticationEvent.Outcome.SUCCESS,
            user=result.user,
            organization=result.organization,
        )
        return Response(session_response(result.user), status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)
    throttle_scope = "login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            record_authentication_event(
                request=request,
                event_type=AuthenticationEvent.EventType.LOGIN,
                outcome=AuthenticationEvent.Outcome.FAILURE,
            )
            return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)
        user = serializer.validated_data["user"]
        auth_login(request, user)
        request.session.set_expiry(None if serializer.validated_data["remember_me"] else 0)
        set_tenant_actor(user_id=user.pk)
        organization = user.memberships.filter(is_active=True, organization__status="active").values_list("organization", flat=True).first()
        record_authentication_event(
            request=request,
            event_type=AuthenticationEvent.EventType.LOGIN,
            outcome=AuthenticationEvent.Outcome.SUCCESS,
            user=user,
            organization_id=organization,
        )
        return Response(session_response(user))


class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        user = request.user
        organization = user.memberships.filter(is_active=True, organization__status="active").values_list("organization", flat=True).first()
        record_authentication_event(
            request=request,
            event_type=AuthenticationEvent.EventType.LOGOUT,
            outcome=AuthenticationEvent.Outcome.SUCCESS,
            user=user,
            organization_id=organization,
        )
        auth_logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SessionRefreshView(APIView):
    permission_classes = (IsAuthenticated,)
    throttle_scope = "session_refresh"

    def post(self, request):
        request.session.cycle_key()
        organization = request.user.memberships.filter(is_active=True, organization__status="active").values_list("organization", flat=True).first()
        record_authentication_event(
            request=request,
            event_type=AuthenticationEvent.EventType.REFRESH,
            outcome=AuthenticationEvent.Outcome.SUCCESS,
            user=request.user,
            organization_id=organization,
        )
        return Response(session_response(request.user))


class CurrentUserView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(session_response(request.user))
