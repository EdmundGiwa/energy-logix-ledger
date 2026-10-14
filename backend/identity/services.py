from .models import AuthenticationEvent


def record_authentication_event(*, request, event_type, outcome, user=None, organization=None, organization_id=None):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    ip_address = forwarded_for.split(",", 1)[0].strip() if forwarded_for else request.META.get("REMOTE_ADDR")
    AuthenticationEvent.objects.create(
        user=user,
        organization=organization,
        organization_id=organization_id,
        event_type=event_type,
        outcome=outcome,
        ip_address=ip_address or None,
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:255],
    )
