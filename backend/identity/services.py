from datetime import timedelta
import hashlib
import logging
import secrets
from typing import Optional

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from core.email import (
    send_password_changed_alert_email,
    send_password_reset_email,
    send_verification_otp_email,
)
from .models import AuthenticationEvent, EmailVerificationCode, PasswordResetToken

logger = logging.getLogger("ofshora.identity")
User = get_user_model()


def hash_secret(value: str) -> str:
    """Computes a SHA-256 hash for secure at-rest token storage."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def record_authentication_event(
    *,
    request=None,
    event_type: str,
    outcome: str,
    user=None,
    organization=None,
    organization_id=None,
):
    ip_address = None
    user_agent = ""
    if request:
        forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
        ip_address = forwarded_for.split(",", 1)[0].strip() if forwarded_for else request.META.get("REMOTE_ADDR")
        user_agent = request.META.get("HTTP_USER_AGENT", "")[:255]

    AuthenticationEvent.objects.create(
        user=user,
        organization=organization,
        organization_id=organization_id,
        event_type=event_type,
        outcome=outcome,
        ip_address=ip_address or None,
        user_agent=user_agent,
    )


@transaction.atomic
def create_and_send_email_verification_otp(user, request=None) -> str:
    """
    Generates a 6-digit numeric OTP, invalidates previous codes,
    stores the SHA-256 hash, and dispatches the verification email.
    """
    # 6-digit numeric string with leading zeros if necessary
    otp = f"{secrets.randbelow(900000) + 100000}"

    # Invalidate old active codes
    EmailVerificationCode.objects.filter(user=user, is_used=False).update(is_used=True)

    EmailVerificationCode.objects.create(
        user=user,
        code_hash=hash_secret(otp),
        expires_at=timezone.now() + timedelta(minutes=15),
    )

    send_verification_otp_email(user=user, code=otp)

    record_authentication_event(
        request=request,
        event_type=AuthenticationEvent.EventType.EMAIL_VERIFY_REQUEST,
        outcome=AuthenticationEvent.Outcome.SUCCESS,
        user=user,
    )

    return otp


@transaction.atomic
def confirm_email_verification_code(*, user, code: str, request=None) -> bool:
    """
    Validates a 6-digit verification code, enforces expiration and attempt limits,
    and marks the user as verified upon match.
    """
    cleaned_code = code.strip()
    active_code = (
        EmailVerificationCode.objects.filter(
            user=user,
            is_used=False,
            expires_at__gt=timezone.now(),
        )
        .order_by("-created_at")
        .first()
    )

    if not active_code:
        record_authentication_event(
            request=request,
            event_type=AuthenticationEvent.EventType.EMAIL_VERIFIED,
            outcome=AuthenticationEvent.Outcome.FAILURE,
            user=user,
        )
        raise ValidationError("Verification code is invalid or has expired. Please request a new code.")

    if active_code.attempts >= 5:
        active_code.is_used = True
        active_code.save(update_fields=["is_used"])
        record_authentication_event(
            request=request,
            event_type=AuthenticationEvent.EventType.EMAIL_VERIFIED,
            outcome=AuthenticationEvent.Outcome.FAILURE,
            user=user,
        )
        raise ValidationError("Too many incorrect attempts. Please request a new verification code.")

    # Constant-time comparison
    computed_hash = hash_secret(cleaned_code)
    if not secrets.compare_digest(active_code.code_hash, computed_hash):
        active_code.attempts += 1
        if active_code.attempts >= 5:
            active_code.is_used = True
        active_code.save(update_fields=["attempts", "is_used"])
        record_authentication_event(
            request=request,
            event_type=AuthenticationEvent.EventType.EMAIL_VERIFIED,
            outcome=AuthenticationEvent.Outcome.FAILURE,
            user=user,
        )
        remaining = 5 - active_code.attempts
        if remaining > 0:
            raise ValidationError(f"Invalid verification code. {remaining} attempt{'s' if remaining > 1 else ''} remaining.")
        raise ValidationError("Too many incorrect attempts. Please request a new code.")

    # Match confirmed
    active_code.is_used = True
    active_code.save(update_fields=["is_used"])

    user.is_email_verified = True
    user.email_verified_at = timezone.now()
    user.save(update_fields=["is_email_verified", "email_verified_at"])

    record_authentication_event(
        request=request,
        event_type=AuthenticationEvent.EventType.EMAIL_VERIFIED,
        outcome=AuthenticationEvent.Outcome.SUCCESS,
        user=user,
    )

    return True


@transaction.atomic
def request_password_reset(email: str, request=None) -> bool:
    """
    Initiates password recovery for an account. Fails generically to prevent
    email enumeration attacks.
    """
    normalized_email = User.objects.normalize_email(email).strip().lower()
    user = User.objects.filter(email__iexact=normalized_email, is_active=True).first()

    if not user:
        record_authentication_event(
            request=request,
            event_type=AuthenticationEvent.EventType.PASSWORD_RESET_REQUEST,
            outcome=AuthenticationEvent.Outcome.FAILURE,
        )
        return True  # Fail silently to client

    raw_token = secrets.token_urlsafe(48)
    token_hash = hash_secret(raw_token)

    # Invalidate previous unused reset tokens
    PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

    PasswordResetToken.objects.create(
        user=user,
        token_hash=token_hash,
        expires_at=timezone.now() + timedelta(minutes=30),
    )

    frontend_base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")
    reset_url = f"{frontend_base}/reset-password?token={raw_token}"

    send_password_reset_email(user=user, reset_url=reset_url)

    record_authentication_event(
        request=request,
        event_type=AuthenticationEvent.EventType.PASSWORD_RESET_REQUEST,
        outcome=AuthenticationEvent.Outcome.SUCCESS,
        user=user,
    )

    return True


@transaction.atomic
def confirm_password_reset(*, token: str, new_password: str, request=None) -> User:
    """
    Validates a password reset token, enforces password requirements,
    rotates the password, invalidates the token, and sends a security notice.
    """
    cleaned_token = token.strip()
    token_hash = hash_secret(cleaned_token)

    reset_record = (
        PasswordResetToken.objects.select_related("user")
        .filter(
            token_hash=token_hash,
            is_used=False,
            expires_at__gt=timezone.now(),
        )
        .first()
    )

    if not reset_record:
        record_authentication_event(
            request=request,
            event_type=AuthenticationEvent.EventType.PASSWORD_RESET_SUCCESS,
            outcome=AuthenticationEvent.Outcome.FAILURE,
        )
        raise ValidationError("This password reset link is invalid or has expired. Please request a new one.")

    user = reset_record.user
    validate_password(new_password, user=user)

    user.set_password(new_password)
    user.save(update_fields=["password"])

    reset_record.is_used = True
    reset_record.save(update_fields=["is_used"])

    # Invalidate any other outstanding reset tokens for this user
    PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

    send_password_changed_alert_email(
        user=user,
        action_description="Your Ofshora account password was successfully reset.",
    )

    record_authentication_event(
        request=request,
        event_type=AuthenticationEvent.EventType.PASSWORD_RESET_SUCCESS,
        outcome=AuthenticationEvent.Outcome.SUCCESS,
        user=user,
    )

    return user
