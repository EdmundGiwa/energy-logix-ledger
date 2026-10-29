import uuid

from django.conf import settings
from django.db import models


class EmailLog(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"
        DELIVERED = "delivered", "Delivered"
        BOUNCED = "bounced", "Bounced"

    class EmailType(models.TextChoices):
        VERIFICATION_OTP = "verification_otp", "Email Verification OTP"
        PASSWORD_RESET = "password_reset", "Password Reset Link"
        PASSWORD_CHANGED = "password_changed", "Password Changed Alert"
        SECURITY_ALERT = "security_alert", "Security Alert"
        NOTIFICATION = "notification", "General Notification"
        INVOICE = "invoice", "Invoice / Billing"
        REPORT = "report", "Operational Report"
        OTHER = "other", "Other"

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="email_logs",
    )
    recipient_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="email_logs",
    )
    recipient_email = models.EmailField(db_index=True)
    sender = models.CharField(max_length=255)
    subject = models.CharField(max_length=255)
    email_type = models.CharField(
        max_length=50,
        choices=EmailType.choices,
        default=EmailType.OTHER,
        db_index=True,
    )
    provider = models.CharField(max_length=50, default="resend")
    provider_message_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    error_message = models.TextField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    sent_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("status", "created_at"), name="emaillog_status_created_idx"),
            models.Index(fields=("recipient_email", "created_at"), name="emaillog_recip_created_idx"),
            models.Index(fields=("email_type", "created_at"), name="emaillog_type_created_idx"),
            models.Index(fields=("organization", "created_at"), name="emaillog_org_created_idx"),
        ]

    def __str__(self):
        return f"[{self.get_status_display()}] {self.email_type} to {self.recipient_email}"

