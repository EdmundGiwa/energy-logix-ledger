import json
import logging
import os
import urllib.error
import urllib.request
from typing import List, Optional, Union

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger("ofshora.email")

DEFAULT_FROM = "Ofshora <notifications@send.ofshora.com>"
DEFAULT_REPLY_TO = "support@ofshora.com"


def get_resend_api_key() -> Optional[str]:
    return (
        os.getenv("RESEND_KEY")
        or os.getenv("RESEND_API_KEY")
        or getattr(settings, "RESEND_KEY", None)
        or getattr(settings, "RESEND_API_KEY", None)
    )


def render_base_email(
    *,
    title: str,
    preheader: str,
    body_html: str,
    recipient_email: str = "",
) -> str:
    """
    Renders an email adhering strictly to the Ofshora design system:
    - White & slate-50 palette (#ffffff card, #f8fafc backdrop, #e2e8f0 border)
    - Dark navy tile logo (#0b1523) with emerald accents
    - Clear 'Ofshora' typography (no 'Energy OS' in copy)
    - Fully responsive table layout compatible with Gmail, Apple Mail, Outlook, etc.
    """
    return f"""<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>{title}</title>
  <style type="text/css">
    body, table, td, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
    table, td {{ mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
    img {{ -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }}
    table {{ border-collapse: collapse !important; }}
    body {{ margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
    a {{ color: #059669; text-decoration: none; }}
    @media screen and (max-width: 600px) {{
      .email-container {{ width: 100% !important; margin: auto !important; }}
      .card-padding {{ padding: 28px 20px !important; }}
      .otp-code {{ font-size: 30px !important; letter-spacing: 6px !important; }}
    }}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <!-- Preheader preview text -->
  <div style="display: none; font-size: 1px; color: #f8fafc; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    {preheader}
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 16px 48px;">
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
        <tr>
        <td align="center" valign="top" width="600">
        <![endif]-->
        
        <table role="presentation" class="email-container" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05); overflow: hidden;">
          
          <!-- Header Bar with Ofshora Logo -->
          <tr>
            <td style="padding: 32px 36px 24px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Brand Tile -->
                  <td valign="middle" style="width: 40px; height: 40px; background: #0b1523; border-radius: 10px; text-align: center; vertical-align: middle;">
                    <div style="font-size: 20px; line-height: 40px; color: #10b981; font-weight: 800; font-family: monospace;">O</div>
                  </td>
                  <!-- Wordmark -->
                  <td valign="middle" style="padding-left: 12px;">
                    <span style="font-size: 19px; font-weight: 800; letter-spacing: 0.04em; color: #0f172a; text-transform: uppercase;">
                      Of<span style="color: #059669;">shora</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="card-padding" style="padding: 36px 36px 32px; background-color: #ffffff;">
              {body_html}
            </td>
          </tr>

          <!-- Security note & Divider -->
          <tr>
            <td style="padding: 0 36px 28px; background-color: #ffffff;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
                    <p style="margin: 0; font-size: 12px; line-height: 18px; color: #94a3b8;">
                      If you did not make this request or have concerns regarding your account, please reach out to our team immediately at <a href="mailto:support@ofshora.com" style="color: #059669; font-weight: 600;">support@ofshora.com</a>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #64748b;">
                © 2026 Ofshora. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                Sent to {recipient_email} • Dedicated sender <span style="font-family: monospace;">send.ofshora.com</span>
              </p>
            </td>
          </tr>

        </table>

        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_transactional_email(
    *,
    to: Union[str, List[str]],
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
    from_email: str = DEFAULT_FROM,
    reply_to: str = DEFAULT_REPLY_TO,
) -> bool:
    """
    Dispatches a transactional email through Resend API (send.ofshora.com).
    Falls back gracefully to Django's in-memory/console backend during tests or local development.
    """
    recipients = [to] if isinstance(to, str) else list(to)
    api_key = get_resend_api_key()

    # In testing mode or when no API key is set, use Django's built-in mail pipeline
    is_test = getattr(settings, "TESTING", False) or "test" in getattr(settings, "SETTINGS_MODULE", "")
    if is_test or not api_key:
        try:
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_content or "Please enable HTML viewing to see this message.",
                from_email=from_email,
                to=recipients,
                reply_to=[reply_to] if reply_to else None,
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=False)
            logger.info("Dispatched email via Django test/local backend to %s", recipients)
            return True
        except Exception as exc:
            logger.warning("Local email fallback failed: %s", exc)
            return False

    # Production delivery via Resend HTTPS API
    url = "https://api.resend.com/emails"
    payload = {
        "from": from_email,
        "to": recipients,
        "subject": subject,
        "html": html_content,
        "reply_to": reply_to,
    }
    if text_content:
        payload["text"] = text_content

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Ofshora-Backend/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            resp_body = response.read().decode("utf-8")
            logger.info("Email delivered via Resend: %s (status: %d)", resp_body, response.status)
            return True
    except urllib.error.HTTPError as err:
        err_msg = err.read().decode("utf-8") if err.fp else str(err)
        logger.error("Resend delivery failed with HTTP %d: %s", err.code, err_msg)
        return False
    except Exception as err:
        logger.error("Unexpected failure sending email via Resend: %s", err)
        return False


def send_verification_otp_email(*, user, code: str) -> bool:
    """Dispatches a 6-digit verification code to the user."""
    first_name = user.first_name or "there"
    title = f"Your Ofshora verification code: {code}"
    preheader = f"Use verification code {code} to confirm your Ofshora account."

    body_html = f"""
      <h1 style="margin: 0 0 16px; font-size: 23px; font-weight: 700; color: #0f172a; line-height: 1.3;">
        Verify your email address
      </h1>
      <p style="margin: 0 0 20px; font-size: 15px; line-height: 24px; color: #475569;">
        Hi {first_name},
      </p>
      <p style="margin: 0 0 28px; font-size: 15px; line-height: 24px; color: #475569;">
        Welcome to Ofshora. Please use the verification code below to verify your email address and activate your account:
      </p>

      <!-- OTP Box -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 28px;">
        <tr>
          <td align="center" style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 24px 16px;">
            <div class="otp-code" style="font-family: 'JetBrains Mono', Consolas, 'Courier New', monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #047857; line-height: 1.1;">
              {code}
            </div>
            <div style="margin-top: 10px; font-size: 12px; font-weight: 600; color: #059669; text-transform: uppercase; letter-spacing: 0.08em;">
              Expires in 15 minutes • One-time use
            </div>
          </td>
        </tr>
      </table>

      <p style="margin: 0; font-size: 14px; line-height: 22px; color: #64748b;">
        Never share this code with anyone. Ofshora representatives will never ask you for your verification code.
      </p>
    """

    text_content = f"""Verify your email address

Hi {first_name},

Welcome to Ofshora. Your one-time verification code is:

{code}

This code expires in 15 minutes. Never share this code with anyone.

If you did not request this, contact support@ofshora.com.
"""

    full_html = render_base_email(
        title=title,
        preheader=preheader,
        body_html=body_html,
        recipient_email=user.email,
    )

    return send_transactional_email(
        to=user.email,
        subject=title,
        html_content=full_html,
        text_content=text_content,
    )


def send_password_reset_email(*, user, reset_url: str) -> bool:
    """Dispatches a password reset link to the user."""
    first_name = user.first_name or "there"
    title = "Reset your Ofshora password"
    preheader = "Click the link inside to set a new password for your Ofshora account."

    body_html = f"""
      <h1 style="margin: 0 0 16px; font-size: 23px; font-weight: 700; color: #0f172a; line-height: 1.3;">
        Reset your password
      </h1>
      <p style="margin: 0 0 20px; font-size: 15px; line-height: 24px; color: #475569;">
        Hi {first_name},
      </p>
      <p style="margin: 0 0 28px; font-size: 15px; line-height: 24px; color: #475569;">
        We received a request to reset the password for your Ofshora account. Click the button below to choose a new password:
      </p>

      <!-- Action Button -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 28px;">
        <tr>
          <td align="center" style="border-radius: 12px; background: #059669; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);">
            <a href="{reset_url}" target="_blank" style="display: inline-block; padding: 15px 32px; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px; letter-spacing: 0.02em;">
              Reset Password →
            </a>
          </td>
        </tr>
      </table>

      <p style="margin: 0 0 12px; font-size: 13px; line-height: 20px; color: #64748b;">
        This reset link will expire in <strong>30 minutes</strong> and can only be used once.
      </p>
      <p style="margin: 0; font-size: 12px; line-height: 18px; color: #94a3b8;">
        If button clicking doesn't work, copy and paste this link into your browser:<br>
        <a href="{reset_url}" style="color: #059669; word-break: break-all;">{reset_url}</a>
      </p>
    """

    text_content = f"""Reset your password

Hi {first_name},

We received a request to reset the password for your Ofshora account.

Reset link: {reset_url}

This link will expire in 30 minutes and can only be used once.
If you did not request this, no action is needed. Your account remains secure.
"""

    full_html = render_base_email(
        title=title,
        preheader=preheader,
        body_html=body_html,
        recipient_email=user.email,
    )

    return send_transactional_email(
        to=user.email,
        subject=title,
        html_content=full_html,
        text_content=text_content,
    )


def send_password_changed_alert_email(*, user, action_description: str = "Your Ofshora account password was successfully reset or changed.") -> bool:
    """Dispatches a password change notification email."""
    return send_security_alert_email(
        user=user,
        action_description=action_description,
    )


def send_security_alert_email(*, user, action_description: str) -> bool:
    """Dispatches an account security notification (e.g. password changed)."""
    first_name = user.first_name or "there"
    title = "Security Alert: Ofshora account update"
    preheader = f"Notice: {action_description} on your Ofshora account."

    body_html = f"""
      <h1 style="margin: 0 0 16px; font-size: 23px; font-weight: 700; color: #0f172a; line-height: 1.3;">
        Security Notice
      </h1>
      <p style="margin: 0 0 20px; font-size: 15px; line-height: 24px; color: #475569;">
        Hi {first_name},
      </p>
      <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 16px 20px; border-radius: 4px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #0f172a;">
          {action_description}
        </p>
      </div>
      <p style="margin: 0; font-size: 14px; line-height: 22px; color: #64748b;">
        If you performed this action, no further steps are needed. If you did not make this change, please immediately contact our team at <a href="mailto:support@ofshora.com" style="color: #059669; font-weight: 600;">support@ofshora.com</a>.
      </p>
    """

    text_content = f"""Security Notice

Hi {first_name},

{action_description}

If you performed this action, no further steps are needed.
If you did not make this change, please contact support@ofshora.com immediately.
"""

    full_html = render_base_email(
        title=title,
        preheader=preheader,
        body_html=body_html,
        recipient_email=user.email,
    )

    return send_transactional_email(
        to=user.email,
        subject=title,
        html_content=full_html,
        text_content=text_content,
    )
