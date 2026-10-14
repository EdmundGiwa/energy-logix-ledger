import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    email = models.EmailField("email address", unique=True)

    def save(self, *args, **kwargs):
        self.email = self.email.strip().lower()
        super().save(*args, **kwargs)


class AuthenticationEvent(models.Model):
    class EventType(models.TextChoices):
        REGISTER = "register", "Register"
        LOGIN = "login", "Login"
        LOGOUT = "logout", "Logout"
        REFRESH = "refresh", "Session refresh"

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
