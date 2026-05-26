"""
routers/schedule.py
POST /schedule/parse   — NLP → structured intent (no booking yet)
POST /schedule/confirm — Confirm & execute booking
DELETE /schedule/{id}  — Cancel a pending or confirmed meeting
"""

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import json
import structlog

from models.database import get_db, Meeting, MeetingStatus, Attendee, ScheduleLog
from services.llm_agent import extract_meeting_intent
from services.directory import resolve_all_attendees
from services.calendar import check_availability, create_event
from services.email import send_meeting_invite
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = structlog.get_logger()
router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class ParseRequest(BaseModel):
    prompt: str
    timezone: str = "Asia/Kolkata"
    conversation_history: Optional[List[dict]] = None  # For multi-turn clarification


class ParseResponse(BaseModel):
    status: str  # ready | needs_info | error
    intent: dict
    clarifying_question: Optional[str] = None


class ConfirmRequest(BaseModel):
    intent: dict           # The parsed intent from /parse
    organizer_email: str
    organizer_name: str
    access_token: str      # Google OAuth token for calendar + directory
    timezone: str = "Asia/Kolkata"
    raw_prompt: Optional[str] = None


class ConfirmResponse(BaseModel):
    meeting_id: str
    title: str
    start_time: str
    end_time: str
    meet_link: Optional[str]
    attendees: List[dict]
    status: str


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/parse", response_model=ParseResponse)
async def parse_prompt(
    body: ParseRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Step 1: Parse a natural language prompt into structured meeting intent.
    Does NOT book anything — just extracts and validates.
    """
    intent = await extract_meeting_intent(
        prompt=body.prompt,
        timezone=body.timezone,
        conversation_history=body.conversation_history,
    )

    # Log the attempt
    log = ScheduleLog(
        raw_prompt=body.prompt,
        parsed_intent=json.dumps(intent),
        outcome=intent.get("status", "error"),
    )
    db.add(log)
    await db.commit()

    return ParseResponse(
        status=intent.get("status"),
        intent=intent,
        clarifying_question=intent.get("clarifying_question"),
    )


@router.post("/confirm", response_model=ConfirmResponse)
async def confirm_meeting(
    body: ConfirmRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Step 2: Execute the confirmed booking.
    - Resolves attendee emails
    - Checks calendar availability
    - Creates Google Calendar event
    - Sends email invitations
    - Saves to DB
    """
    intent = body.intent

    if intent.get("status") != "ready":
        raise HTTPException(status_code=400, detail="Intent is not ready for confirmation.")

    # 1. Parse datetimes
    try:
        start_time = datetime.fromisoformat(intent["start_datetime"])
        end_time = datetime.fromisoformat(intent["end_datetime"])
    except (KeyError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid datetime format: {e}")

    # 2. Resolve attendee emails
    raw_attendees = intent.get("attendees", [])
    resolved_attendees, unresolved = await resolve_all_attendees(
        raw_attendees, db, body.access_token
    )

    if unresolved:
        raise HTTPException(
            status_code=422,
            detail=f"Could not resolve emails for: {', '.join(unresolved)}. "
                   "Please provide their email addresses directly."
        )

    if not resolved_attendees:
        raise HTTPException(status_code=422, detail="No valid attendees found.")

    # 3. Check availability
    all_emails = [body.organizer_email] + [a["email"] for a in resolved_attendees]
    availability = await check_availability(
        body.access_token, all_emails, start_time, end_time
    )

    if not availability["available"]:
        conflict_emails = [c["email"] for c in availability["conflicts"]]
        raise HTTPException(
            status_code=409,
            detail=f"Scheduling conflict: {', '.join(conflict_emails)} are busy at that time. "
                   "Please choose a different time slot."
        )

    # 4. Create Google Calendar event
    attendee_emails = [a["email"] for a in resolved_attendees]
    calendar_result = await create_event(
        access_token=body.access_token,
        title=intent["title"],
        start_time=start_time,
        end_time=end_time,
        attendee_emails=attendee_emails,
        agenda=intent.get("agenda"),
        organizer_email=body.organizer_email,
        timezone=body.timezone,
    )

    # 5. Send email invitations via SendGrid
    await send_meeting_invite(
        to_emails=attendee_emails,
        to_names=[a["name"] for a in resolved_attendees],
        organizer_name=body.organizer_name,
        title=intent["title"],
        start_time=start_time,
        end_time=end_time,
        agenda=intent.get("agenda"),
        meet_link=calendar_result.get("meet_link"),
        timezone=body.timezone,
    )

    # 6. Persist to DB
    from models.database import User
    # Upsert organizer
    result = await db.execute(select(User).where(User.email == body.organizer_email))
    organizer = result.scalar_one_or_none()
    if not organizer:
        organizer = User(email=body.organizer_email, name=body.organizer_name,
                         google_access_token=body.access_token)
        db.add(organizer)
        await db.flush()

    meeting = Meeting(
        organizer_id=organizer.id,
        title=intent["title"],
        agenda=intent.get("agenda"),
        start_time=start_time,
        end_time=end_time,
        google_event_id=calendar_result.get("event_id"),
        meet_link=calendar_result.get("meet_link"),
        status=MeetingStatus.CONFIRMED,
        raw_prompt=body.raw_prompt,
    )
    db.add(meeting)
    await db.flush()

    for att in resolved_attendees:
        db.add(Attendee(meeting_id=meeting.id, email=att["email"], name=att["name"]))

    await db.commit()

    logger.info("Meeting confirmed", meeting_id=meeting.id, title=meeting.title)

    return ConfirmResponse(
        meeting_id=meeting.id,
        title=meeting.title,
        start_time=start_time.isoformat(),
        end_time=end_time.isoformat(),
        meet_link=calendar_result.get("meet_link"),
        attendees=resolved_attendees,
        status="confirmed",
    )
