import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    email = models.EmailField("email address", unique=True)
    is_email_verified = models.BooleanField(default=False)
    email_verified_at = models.DateTimeField(blank=True, null=True)

    def save(self, *args, **kwargs):
        self.email = self.email.strip().lower()
        super().save(*args, **kwargs)


class EmailVerificationCode(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="verification_codes")
    code_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    attempts = models.PositiveIntegerField(default=0)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("user", "is_used", "expires_at"), name="user_verify_code_idx"),
        ]

    def __str__(self):
        return f"Verification code for {self.user.email} (used: {self.is_used})"


class PasswordResetToken(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="password_reset_tokens")
    token_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("user", "is_used", "expires_at"), name="user_pw_reset_token_idx"),
        ]

    def __str__(self):
        return f"Password reset token for {self.user.email} (used: {self.is_used})"


class AuthenticationEvent(models.Model):
    class EventType(models.TextChoices):
        REGISTER = "register", "Register"
        LOGIN = "login", "Login"
        LOGOUT = "logout", "Logout"
        REFRESH = "refresh", "Session refresh"
        EMAIL_VERIFY_REQUEST = "email_verify_req", "Email verification requested"
        EMAIL_VERIFIED = "email_verified", "Email verified"
        PASSWORD_RESET_REQUEST = "pw_reset_req", "Password reset requested"
        PASSWORD_RESET_SUCCESS = "pw_reset_success", "Password reset completed"

    class Outcome(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILURE = "failure", "Failure"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(User, blank=True, null=True, on_delete=models.SET_NULL, related_name="authentication_events")
    organization = models.ForeignKey(
        "organizations.Organization",
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name="authentication_events",
    )
    event_type = models.CharField(max_length=20, choices=EventType.choices)
    outcome = models.CharField(max_length=20, choices=Outcome.choices)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.CharField(blank=True, max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
