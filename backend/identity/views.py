from django.contrib.auth import get_user_model
from django.contrib.auth import login as auth_login
from django.contrib.auth import logout as auth_logout
from django.core.exceptions import ValidationError as DjangoValidationError
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
from .serializers import (
    CurrentUserSerializer,
    EmailVerificationConfirmSerializer,
    EmailVerificationRequestSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegistrationSerializer,
)
from .services import (
    confirm_email_verification_code,
    confirm_password_reset,
    create_and_send_email_verification_otp,
    record_authentication_event,
    request_password_reset,
)

User = get_user_model()


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

        # Automatically dispatch email verification OTP code
        try:
            create_and_send_email_verification_otp(result.user, request=request)
        except Exception:
            # Failure to send email during registration should not roll back account creation
            pass

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


@method_decorator(csrf_protect, name="dispatch")
class EmailVerificationRequestView(APIView):
    """Requests or resends a 6-digit email verification OTP."""
    permission_classes = (AllowAny,)
    throttle_scope = "email_verification"

    def post(self, request):
        serializer = EmailVerificationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data.get("email")

        target_user = request.user if request.user.is_authenticated else None
        if not target_user and email:
            target_user = User.objects.filter(email__iexact=email, is_active=True).first()

        if not target_user:
            return Response(
                {"detail": "Unable to locate an active account for verification."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if target_user.is_email_verified:
            return Response({"detail": "Email is already verified.", "is_email_verified": True})

        create_and_send_email_verification_otp(target_user, request=request)
        return Response({"detail": f"Verification code sent to {target_user.email}."})


@method_decorator(csrf_protect, name="dispatch")
class EmailVerificationConfirmView(APIView):
    """Validates the 6-digit OTP and marks user's email as verified."""
    permission_classes = (AllowAny,)
    throttle_scope = "email_verification"

    def post(self, request):
        serializer = EmailVerificationConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data["code"]
        email = serializer.validated_data.get("email")

        target_user = request.user if request.user.is_authenticated else None
        if not target_user and email:
            target_user = User.objects.filter(email__iexact=email, is_active=True).first()

        if not target_user:
            return Response(
                {"detail": "Unable to locate account for verification."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            confirm_email_verification_code(user=target_user, code=code, request=request)
        except DjangoValidationError as exc:
            return Response({"detail": exc.message}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "detail": "Email verified successfully.",
            "is_email_verified": True,
        })


@method_decorator(csrf_protect, name="dispatch")
class PasswordResetRequestView(APIView):
    """Requests a secure password reset link sent via email."""
    authentication_classes = ()
    permission_classes = (AllowAny,)
    throttle_scope = "password_reset"

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        request_password_reset(email=email, request=request)
        return Response({
            "detail": "If an active account exists with this email address, a password reset link has been dispatched."
        })


@method_decorator(csrf_protect, name="dispatch")
class PasswordResetConfirmView(APIView):
    """Sets a new password using a verified password reset token."""
    authentication_classes = ()
    permission_classes = (AllowAny,)
    throttle_scope = "password_reset"

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data["token"]
        password = serializer.validated_data["password"]

        try:
            confirm_password_reset(token=token, new_password=password, request=request)
        except DjangoValidationError as exc:
            msg = exc.messages[0] if hasattr(exc, "messages") else str(exc)
            return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "detail": "Your password has been successfully reset. You may now sign in."
        })
