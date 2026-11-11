"""Book-a-Demo business rules. Views and admin actions must call these functions."""

import logging
import secrets
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from html import escape
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from core.email import render_base_email, send_transactional_email

from . import catalog
from .models import DemoRequest, DemoRequestEvent

logger = logging.getLogger("offshora.demo_requests")

_REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I

ALLOWED_TRANSITIONS = {
    DemoRequest.Status.REQUESTED: {DemoRequest.Status.CONFIRMED, DemoRequest.Status.CANCELLED},
    DemoRequest.Status.CONFIRMED: {
        DemoRequest.Status.COMPLETED,
        DemoRequest.Status.NO_SHOW,
        DemoRequest.Status.CANCELLED,
    },
}


class SlotUnavailable(Exception):
    """The chosen slot is not offered or has just been taken."""


class InvalidTransition(Exception):
    pass


@dataclass(frozen=True)
class BookingConfig:
    timezone: ZoneInfo
    weekdays: frozenset
    start_times: tuple
    duration_minutes: int
    horizon_days: int
    min_notice_hours: int
    notify_emails: tuple


def booking_config() -> BookingConfig:
    raw = settings.DEMO_BOOKING
    return BookingConfig(
        timezone=ZoneInfo(raw["TIMEZONE"]),
        weekdays=frozenset(raw["WEEKDAYS"]),
        start_times=tuple(time.fromisoformat(value) for value in raw["START_TIMES"]),
        duration_minutes=int(raw["DURATION_MINUTES"]),
        horizon_days=int(raw["HORIZON_DAYS"]),
        min_notice_hours=int(raw["MIN_NOTICE_HOURS"]),
        notify_emails=tuple(raw["NOTIFY_EMAILS"]),
    )


def _candidate_slots(config: BookingConfig, now: datetime) -> list[datetime]:
    earliest = now + timedelta(hours=config.min_notice_hours)
    local_today = now.astimezone(config.timezone).date()
    slots = []
    for offset in range(config.horizon_days + 1):
        day = local_today + timedelta(days=offset)
        if day.weekday() not in config.weekdays:
            continue
        for start in config.start_times:
            slot = datetime.combine(day, start, tzinfo=config.timezone).astimezone(ZoneInfo("UTC"))
            if slot >= earliest:
                slots.append(slot)
    return slots


def list_available_slots(now: datetime | None = None) -> list[datetime]:
    """Bookable slot start times in UTC, excluding slots already held."""
    config = booking_config()
    now = now or timezone.now()
    candidates = _candidate_slots(config, now)
    if not candidates:
        return []
    taken = set(
        DemoRequest.objects.filter(
            status__in=DemoRequest.ACTIVE_STATUSES,
            scheduled_start__gte=candidates[0],
            scheduled_start__lte=candidates[-1],
        ).values_list("scheduled_start", flat=True)
    )
    return [slot for slot in candidates if slot not in taken]


def _new_reference() -> str:
    return "OFS-" + "".join(secrets.choice(_REFERENCE_ALPHABET) for _ in range(6))


@dataclass(frozen=True)
class BookingResult:
    demo_request: DemoRequest
    created: bool


def create_demo_request(*, data: dict, now: datetime | None = None) -> BookingResult:
    """Book a demo slot.

    ``data`` must already be validated by ``DemoRequestCreateSerializer``. Re-submitting
    the same email for the same active slot returns the existing booking (safe retry).
    """
    config = booking_config()
    now = now or timezone.now()
    scheduled_start = data["scheduled_start"].astimezone(ZoneInfo("UTC"))

    existing = DemoRequest.objects.filter(
        scheduled_start=scheduled_start,
        status__in=DemoRequest.ACTIVE_STATUSES,
        work_email__iexact=data["work_email"],
    ).first()
    if existing:
        return BookingResult(existing, created=False)

    if scheduled_start not in _candidate_slots(config, now):
        raise SlotUnavailable("That time is not available. Please pick another slot.")

    for _attempt in range(5):
        try:
            with transaction.atomic():
                demo = DemoRequest.objects.create(
                    **{**data, "scheduled_start": scheduled_start},
                    reference=_new_reference(),
                    duration_minutes=config.duration_minutes,
                    status=DemoRequest.Status.REQUESTED,
                )
                DemoRequestEvent.objects.create(
                    demo_request=demo,
                    from_status="",
                    to_status=DemoRequest.Status.REQUESTED,
                    reason="Booked through the public demo form.",
                )
        except IntegrityError as exc:
            if "demo_request_unique_active_slot" in str(exc):
                raise SlotUnavailable("Someone just booked that slot. Please pick another time.") from exc
            if "reference" in str(exc):
                continue  # astronomically rare reference collision; retry with a new one
            raise
        transaction.on_commit(lambda: send_demo_request_emails(demo))
        return BookingResult(demo, created=True)
    raise RuntimeError("Could not allocate a unique demo reference.")


def transition_demo_request(*, demo_request: DemoRequest, to_status: str, actor, reason: str = "") -> DemoRequest:
    """Move a demo request to a new status and record who did it."""
    with transaction.atomic():
        locked = DemoRequest.objects.select_for_update().get(pk=demo_request.pk)
        from_status = locked.status
        if from_status == to_status:
            return locked  # idempotent
        if to_status not in ALLOWED_TRANSITIONS.get(from_status, set()):
            raise InvalidTransition(f"Cannot move {locked.reference} from {from_status} to {to_status}.")
        locked.status = to_status
        locked.save(update_fields=["status", "updated_at"])
        DemoRequestEvent.objects.create(
            demo_request=locked,
            from_status=from_status,
            to_status=to_status,
            actor=actor,
            reason=reason[:300],
        )
    return locked


# ── Emails ──────────────────────────────────────────────────────────────────


def _labels(values, mapping) -> str:
    return ", ".join(mapping.get(value, value) for value in values) or "—"


def _format_local(moment: datetime, tz_name: str) -> str:
    local = moment.astimezone(ZoneInfo(tz_name))
    return local.strftime("%A %d %B %Y, %H:%M ") + (local.tzname() or tz_name)


def google_calendar_link(demo: DemoRequest) -> str:
    end = demo.scheduled_start + timedelta(minutes=demo.duration_minutes)
    fmt = "%Y%m%dT%H%M%SZ"
    params = {
        "action": "TEMPLATE",
        "text": f"Offshora demo · {demo.company_name}",
        "dates": f"{demo.scheduled_start.strftime(fmt)}/{end.strftime(fmt)}",
        "details": f"Tailored Offshora walkthrough. Reference {demo.reference}.",
    }
    return "https://calendar.google.com/calendar/render?" + urlencode(params)


def _row(label: str, value: str) -> str:
    return (
        '<tr><td style="padding:6px 0;font-size:13px;color:#64748b;width:150px;vertical-align:top;">'
        f"{escape(label)}</td>"
        f'<td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600;">{escape(value)}</td></tr>'
    )


def send_demo_request_emails(demo: DemoRequest) -> None:
    """Confirmation to the prospect and a briefing to the sales inbox.

    Every prospect-supplied value is HTML-escaped. Delivery failures are recorded in
    EmailLog by ``send_transactional_email`` and never undo the booking.
    """
    config = booking_config()
    prospect_time = _format_local(demo.scheduled_start, demo.prospect_timezone)
    team_time = _format_local(demo.scheduled_start, config.timezone.key)
    meeting = demo.get_meeting_format_display()
    if demo.on_site_location:
        meeting = f"{meeting} — {demo.on_site_location}"
    modules = _labels(demo.interested_modules, catalog.MODULES)
    first_name = demo.full_name.split()[0] if demo.full_name.split() else "there"

    prospect_body = f"""
      <h1 style="margin:0 0 16px;font-size:23px;font-weight:700;color:#0f172a;line-height:1.3;">Your demo is booked</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:24px;color:#475569;">Hi {escape(first_name)},</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#475569;">
        Thanks for booking a walkthrough of Offshora for {escape(demo.company_name)}. We will tailor the session
        to the modules you picked, and send your meeting link within one business day.
      </p>
      <table role="presentation" width="100%" style="margin:0 0 24px;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;">
        {_row("Reference", demo.reference)}
        {_row("When", prospect_time)}
        {_row("Length", f"{demo.duration_minutes} minutes")}
        {_row("Format", meeting)}
        {_row("Modules", modules)}
      </table>
      <p style="margin:0 0 8px;">
        <a href="{escape(google_calendar_link(demo))}" style="display:inline-block;background:#059669;color:#ffffff;font-weight:700;font-size:14px;padding:12px 20px;border-radius:10px;">Add to Google Calendar</a>
      </p>
      <p style="margin:16px 0 0;font-size:13px;line-height:20px;color:#64748b;">
        Need a different time? Reply to this email with your reference and we will move it.
      </p>
    """
    send_transactional_email(
        to=demo.work_email,
        subject=f"Your Offshora demo is booked · {demo.reference}",
        html_content=render_base_email(
            title="Your Offshora demo is booked",
            preheader=escape(f"{prospect_time} · reference {demo.reference}"),
            body_html=prospect_body,
            recipient_email=escape(demo.work_email),
        ),
        text_content=(
            f"Your Offshora demo is booked.\n\nReference: {demo.reference}\nWhen: {prospect_time}\n"
            f"Length: {demo.duration_minutes} minutes\nFormat: {meeting}\nModules: {modules}\n\n"
            "We will send your meeting link within one business day.\n"
        ),
        email_type="demo_request_confirmation",
        metadata={"demo_reference": demo.reference},
    )

    if not config.notify_emails:
        logger.warning("No DEMO_REQUEST_NOTIFY_EMAILS configured; sales was not emailed about %s.", demo.reference)
        return

    sales_body = f"""
      <h1 style="margin:0 0 16px;font-size:21px;font-weight:700;color:#0f172a;">New demo: {escape(demo.company_name)}</h1>
      <table role="presentation" width="100%" style="margin:0 0 8px;">
        {_row("Reference", demo.reference)}
        {_row("When (WAT)", team_time)}
        {_row("Prospect time", prospect_time)}
        {_row("Format", meeting)}
        {_row("Contact", f"{demo.full_name}, {demo.job_title}")}
        {_row("Email", demo.work_email)}
        {_row("Phone", demo.phone)}
        {_row("Website", demo.company_website or "—")}
        {_row("Segment", catalog.SEGMENTS.get(demo.segment, demo.segment))}
        {_row("Size", demo.get_company_size_display())}
        {_row("Countries", _labels(demo.countries, catalog.COUNTRIES))}
        {_row("Operations", _labels(demo.operations, catalog.OPERATIONS))}
        {_row("Pain points", _labels(demo.pain_points, catalog.PAIN_POINTS))}
        {_row("Current tools", demo.get_current_tools_display())}
        {_row("Modules", modules)}
        {_row("Notes", demo.notes or "—")}
      </table>
    """
    send_transactional_email(
        to=list(config.notify_emails),
        subject=f"New demo booked · {demo.company_name} · {demo.reference}",
        html_content=render_base_email(
            title="New Offshora demo request",
            preheader=escape(f"{demo.company_name} · {team_time}"),
            body_html=sales_body,
            recipient_email=escape(", ".join(config.notify_emails)),
        ),
        reply_to=demo.work_email,
        email_type="demo_request_sales_alert",
        metadata={"demo_reference": demo.reference},
    )
