# API Reference

Base URL: `http://localhost:8000`

---

## Auth

### `GET /auth/login`
Redirects to Google OAuth consent screen.

### `GET /auth/callback?code=...`
Handles OAuth callback. Returns:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_expiry": "2024-06-16T12:00:00"
}
```

---

## Transcribe (STT)

### `POST /transcribe/`
Upload audio file → transcribed text.

**Form data:** `file` (audio/webm, audio/wav, etc.)

**Response:**
```json
{ "text": "Schedule a meeting with Priya tomorrow at 3 PM", "language": "en", "duration": 4.2 }
```

---

## Schedule

### `POST /schedule/parse`
Parse a natural language prompt into structured intent.

**Body:**
```json
{
  "prompt": "Book a sync with Rohan tomorrow at 2 PM",
  "timezone": "Asia/Kolkata",
  "conversation_history": []
}
```

**Response (ready):**
```json
{
  "status": "ready",
  "intent": {
    "status": "ready",
    "title": "Sync with Rohan",
    "attendees": [{"name": "Rohan", "email": null}],
    "start_datetime": "2024-06-16T14:00:00",
    "end_datetime": "2024-06-16T14:30:00",
    "duration_minutes": 30,
    "confidence": 0.92
  }
}
```

**Response (needs_info):**
```json
{
  "status": "needs_info",
  "intent": { "status": "needs_info", "clarifying_question": "What time should the meeting be?" },
  "clarifying_question": "What time should the meeting be?"
}
```

### `POST /schedule/confirm`
Execute a confirmed booking.

**Body:**
```json
{
  "intent": { ...parsed intent from /parse... },
  "organizer_email": "user@company.com",
  "organizer_name": "Jane Doe",
  "access_token": "google-oauth-token",
  "timezone": "Asia/Kolkata",
  "raw_prompt": "original prompt"
}
```

**Response:**
```json
{
  "meeting_id": "uuid",
  "title": "Sync with Rohan",
  "start_time": "2024-06-16T14:00:00",
  "end_time": "2024-06-16T14:30:00",
  "meet_link": "https://meet.google.com/xxx-xxxx-xxx",
  "attendees": [{"name": "Rohan", "email": "rohan@company.com"}],
  "status": "confirmed"
}
```

**Error responses:**
- `422`: Unresolvable attendee email
- `409`: Scheduling conflict

---

## Meetings

### `GET /meetings/?organizer_email=...`
List all meetings for an organizer.

### `GET /meetings/{id}`
Get a single meeting.

### `DELETE /meetings/{id}?access_token=...&organizer_name=...`
Cancel a meeting. Removes from Google Calendar and notifies attendees.

---

## Health

### `GET /health`
```json
{ "status": "ok", "version": "1.0.0" }
```
