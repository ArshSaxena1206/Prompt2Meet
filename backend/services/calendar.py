"""
services/calendar.py
Google Calendar API v3 integration.
  - Check availability (free/busy)
  - Create calendar events with Meet link
  - Delete / cancel events
"""

from datetime import datetime, timedelta
from typing import List, Optional
import json

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import structlog

logger = structlog.get_logger()

SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
]


def _build_service(access_token: str, refresh_token: Optional[str] = None):
    """Build authenticated Google Calendar service."""
    from utils.config import settings

    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=SCOPES,
    )
    return build("calendar", "v3", credentials=creds)


async def check_availability(
    access_token: str,
    attendee_emails: List[str],
    start_time: datetime,
    end_time: datetime,
) -> dict:
    """
    Check free/busy status for a list of emails in a time range.

    Returns:
        {
          "available": True/False,
          "conflicts": [
            {"email": "...", "busy_periods": [...]}
          ]
        }
    """
    try:
        service = _build_service(access_token)

        body = {
            "timeMin": start_time.isoformat() + "Z",
            "timeMax": end_time.isoformat() + "Z",
            "timeZone": "UTC",
            "items": [{"id": email} for email in attendee_emails],
        }

        result = service.freebusy().query(body=body).execute()
        calendars = result.get("calendars", {})

        conflicts = []
        for email in attendee_emails:
            busy = calendars.get(email, {}).get("busy", [])
            if busy:
                conflicts.append({"email": email, "busy_periods": busy})

        return {
            "available": len(conflicts) == 0,
            "conflicts": conflicts,
        }

    except HttpError as e:
        logger.error("Google Calendar freebusy check failed", error=str(e))
        # Fail open — don't block scheduling if calendar check fails
        return {"available": True, "conflicts": [], "warning": str(e)}


async def create_event(
    access_token: str,
    title: str,
    start_time: datetime,
    end_time: datetime,
    attendee_emails: List[str],
    agenda: Optional[str] = None,
    organizer_email: Optional[str] = None,
    timezone: str = "Asia/Kolkata",
) -> dict:
    """
    Create a Google Calendar event with Google Meet link.

    Returns the created event dict with `id` and `hangoutLink`.
    """
    service = _build_service(access_token)

    attendees = [{"email": email} for email in attendee_emails]

    event_body = {
        "summary": title,
        "description": agenda or "",
        "start": {
            "dateTime": start_time.isoformat(),
            "timeZone": timezone,
        },
        "end": {
            "dateTime": end_time.isoformat(),
            "timeZone": timezone,
        },
        "attendees": attendees,
        "conferenceData": {
            "createRequest": {
                "requestId": f"meet-{start_time.timestamp():.0f}",
                "conferenceSolutionKey": {"type": "hangoutsMeet"},
            }
        },
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "email", "minutes": 60},
                {"method": "popup", "minutes": 10},
            ],
        },
        "guestsCanModifyEvent": False,
        "guestsCanInviteOthers": False,
    }

    try:
        created = (
            service.events()
            .insert(
                calendarId="primary",
                body=event_body,
                conferenceDataVersion=1,
                sendUpdates="all",  # Google sends invite emails automatically
            )
            .execute()
        )

        logger.info("Calendar event created",
                    event_id=created["id"],
                    title=title,
                    start=start_time.isoformat())

        return {
            "event_id": created["id"],
            "html_link": created.get("htmlLink"),
            "meet_link": created.get("hangoutLink"),
            "status": created.get("status"),
        }

    except HttpError as e:
        logger.error("Failed to create calendar event", error=str(e))
        raise RuntimeError(f"Calendar event creation failed: {str(e)}")


async def delete_event(access_token: str, event_id: str) -> bool:
    """Cancel/delete a calendar event."""
    try:
        service = _build_service(access_token)
        service.events().delete(
            calendarId="primary",
            eventId=event_id,
            sendUpdates="all",
        ).execute()
        logger.info("Calendar event deleted", event_id=event_id)
        return True
    except HttpError as e:
        logger.error("Failed to delete calendar event", error=str(e))
        return False


async def get_upcoming_events(access_token: str, max_results: int = 10) -> list:
    """Fetch upcoming events from primary calendar."""
    try:
        service = _build_service(access_token)
        now = datetime.utcnow().isoformat() + "Z"
        events_result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=now,
                maxResults=max_results,
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )
        return events_result.get("items", [])
    except HttpError as e:
        logger.error("Failed to fetch upcoming events", error=str(e))
        return []
