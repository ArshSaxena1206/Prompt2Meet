"""routers/meetings.py — CRUD endpoints for scheduled meetings"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from datetime import datetime
import structlog

from models.database import get_db, Meeting, Attendee, MeetingStatus
from services.calendar import delete_event
from services.email import send_cancellation_email

logger = structlog.get_logger()
router = APIRouter()


class MeetingOut(BaseModel):
    id: str
    title: str
    start_time: datetime
    end_time: datetime
    meet_link: Optional[str]
    status: str
    attendees: List[dict]
    agenda: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[MeetingOut])
async def list_meetings(
    organizer_email: str,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """List all meetings for a given organizer email."""
    from models.database import User
    result = await db.execute(select(User).where(User.email == organizer_email))
    user = result.scalar_one_or_none()
    if not user:
        return []

    stmt = (
        select(Meeting)
        .where(Meeting.organizer_id == user.id)
        .order_by(desc(Meeting.start_time))
        .limit(limit)
    )
    meetings_result = await db.execute(stmt)
    meetings = meetings_result.scalars().all()

    output = []
    for m in meetings:
        att_result = await db.execute(
            select(Attendee).where(Attendee.meeting_id == m.id)
        )
        attendees = [{"name": a.name, "email": a.email} for a in att_result.scalars().all()]
        output.append(MeetingOut(
            id=m.id,
            title=m.title,
            start_time=m.start_time,
            end_time=m.end_time,
            meet_link=m.meet_link,
            status=m.status.value,
            attendees=attendees,
            agenda=m.agenda,
            created_at=m.created_at,
        ))
    return output


@router.get("/{meeting_id}", response_model=MeetingOut)
async def get_meeting(meeting_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    att_result = await db.execute(select(Attendee).where(Attendee.meeting_id == meeting_id))
    attendees = [{"name": a.name, "email": a.email} for a in att_result.scalars().all()]

    return MeetingOut(
        id=meeting.id,
        title=meeting.title,
        start_time=meeting.start_time,
        end_time=meeting.end_time,
        meet_link=meeting.meet_link,
        status=meeting.status.value,
        attendees=attendees,
        agenda=meeting.agenda,
        created_at=meeting.created_at,
    )


@router.delete("/{meeting_id}")
async def cancel_meeting(
    meeting_id: str,
    access_token: str,
    organizer_name: str = "Organizer",
    db: AsyncSession = Depends(get_db),
):
    """Cancel a meeting: remove from Google Calendar + notify attendees."""
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if meeting.status == MeetingStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Meeting is already cancelled")

    # Delete from Google Calendar
    if meeting.google_event_id:
        await delete_event(access_token, meeting.google_event_id)

    # Notify attendees
    att_result = await db.execute(select(Attendee).where(Attendee.meeting_id == meeting_id))
    attendees = att_result.scalars().all()
    if attendees:
        await send_cancellation_email(
            to_emails=[a.email for a in attendees],
            to_names=[a.name for a in attendees],
            title=meeting.title,
            start_time=meeting.start_time,
            organizer_name=organizer_name,
        )

    # Update DB status
    meeting.status = MeetingStatus.CANCELLED
    await db.commit()

    return {"status": "cancelled", "meeting_id": meeting_id}
