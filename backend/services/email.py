"""services/email.py — Resend email notifications for meeting invites"""

from typing import List, Optional
from datetime import datetime
import pytz
import resend
import structlog

from utils.config import settings

logger = structlog.get_logger()
resend.api_key = settings.RESEND_API_KEY


def _format_datetime(dt: datetime, timezone: str = "Asia/Kolkata") -> str:
    tz = pytz.timezone(timezone)
    local_dt = dt.astimezone(tz)
    return local_dt.strftime("%A, %B %d, %Y at %I:%M %p %Z")


def _build_invite_html(
    title: str,
    start_time: datetime,
    end_time: datetime,
    organizer_name: str,
    attendee_name: str,
    agenda: Optional[str],
    meet_link: Optional[str],
    timezone: str = "Asia/Kolkata",
) -> str:
    start_str = _format_datetime(start_time, timezone)
    duration_min = int((end_time - start_time).total_seconds() / 60)

    meet_section = f"""
    <tr>
      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">📹 Video Link</td>
      <td style="padding: 8px 0; font-size: 14px;">
        <a href="{meet_link}" style="color: #3b82f6;">Join Google Meet</a>
      </td>
    </tr>
    """ if meet_link else ""

    agenda_section = f"""
    <div style="background:#f9fafb;border-left:3px solid #3b82f6;padding:12px 16px;margin:20px 0;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Agenda</p>
      <p style="margin:8px 0 0;font-size:14px;color:#374151;">{agenda}</p>
    </div>
    """ if agenda else ""

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6;padding:40px 20px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px;text-align:center;">
      <div style="font-size:32px;margin-bottom:8px;">📅</div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:600;">Meeting Invitation</h1>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="color:#374151;font-size:15px;margin:0 0 24px;">Hi {attendee_name},</p>
      <p style="color:#374151;font-size:15px;margin:0 0 24px;">
        <strong>{organizer_name}</strong> has scheduled a meeting with you:
      </p>

      <div style="background:#f8faff;border:1px solid #e0e7ff;border-radius:8px;padding:20px;margin-bottom:24px;">
        <h2 style="color:#1e40af;margin:0 0 16px;font-size:18px;">{title}</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;width:100px;">🕐 When</td>
            <td style="padding:8px 0;font-size:14px;color:#111827;">{start_str}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">⏱ Duration</td>
            <td style="padding:8px 0;font-size:14px;color:#111827;">{duration_min} minutes</td>
          </tr>
          {meet_section}
        </table>
      </div>

      {agenda_section}

      {"<div style='text-align:center;margin-top:24px;'><a href='" + meet_link + "' style='background:#3b82f6;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;display:inline-block;'>Join Meeting</a></div>" if meet_link else ""}
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">
        Sent by AI Meeting Scheduler · This is an automated invitation.
      </p>
    </div>
  </div>
</body>
</html>
"""


async def send_meeting_invite(
    to_emails: List[str],
    to_names: List[str],
    organizer_name: str,
    title: str,
    start_time: datetime,
    end_time: datetime,
    agenda: Optional[str] = None,
    meet_link: Optional[str] = None,
    timezone: str = "Asia/Kolkata",
) -> bool:
    """Send meeting invitation emails to all attendees."""
    success = True

    for email, name in zip(to_emails, to_names):
        html_content = _build_invite_html(
            title=title,
            start_time=start_time,
            end_time=end_time,
            organizer_name=organizer_name,
            attendee_name=name,
            agenda=agenda,
            meet_link=meet_link,
            timezone=timezone,
        )

        try:
            params = {
                "from": f"{settings.RESEND_FROM_NAME} <{settings.RESEND_FROM_EMAIL}>",
                "to": [f"{name} <{email}>"],
                "subject": f"Meeting Invitation: {title}",
                "html": html_content,
            }
            resend.Emails.send(params)
            logger.info("Invite email sent", to=email)
        except Exception as e:
            logger.error("Failed to send invite email", to=email, error=str(e))
            success = False

    return success


async def send_cancellation_email(
    to_emails: List[str],
    to_names: List[str],
    title: str,
    start_time: datetime,
    organizer_name: str,
    timezone: str = "Asia/Kolkata",
) -> bool:
    """Notify attendees that a meeting has been cancelled."""
    start_str = _format_datetime(start_time, timezone)

    for email, name in zip(to_emails, to_names):
        html = f"""
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px;">
          <h2 style="color:#dc2626;">❌ Meeting Cancelled</h2>
          <p>Hi {name},</p>
          <p>The following meeting has been cancelled by <strong>{organizer_name}</strong>:</p>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
            <strong>{title}</strong><br>
            <span style="color:#6b7280;">{start_str}</span>
          </div>
        </div>
        """
        try:
            params = {
                "from": f"{settings.RESEND_FROM_NAME} <{settings.RESEND_FROM_EMAIL}>",
                "to": [f"{name} <{email}>"],
                "subject": f"Cancelled: {title}",
                "html": html,
            }
            resend.Emails.send(params)
            logger.info("Cancellation email sent", to=email)
        except Exception as e:
            logger.error("Failed to send cancellation email", to=email, error=str(e))

    return True
