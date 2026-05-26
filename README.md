# AI Meeting Scheduler

An end-to-end intelligent meeting scheduling system powered by Google Gemini 1.5 Flash, browser-native Web Speech API, Google Calendar API, and Resend.

## Architecture

```text
┌────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                        │
│   Text Input / Web Speech API (Local STT) → Chat Interface     │
└──────────────────────┬─────────────────────────────────────────┘
                       │ HTTP / REST
┌──────────────────────▼─────────────────────────────────────────┐
│                       FastAPI Backend                          │
│        /schedule    /status    /meetings    /confirm           │
└───────┬───────────────────┬───────────────────┬────────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
     Google Gemini      Google Cal           Resend
     1.5 Flash (LLM)    API (CRUD)            Email
        │
        ▼
   PostgreSQL (logs, meetings, users) via Docker / Supabase
```

## Stack

| Layer | Technology |
| ------- | ----------- |
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Backend | FastAPI (Python 3.11+) |
| LLM | Google Gemini 1.5 Flash (free tier) |
| STT | Web Speech API (browser-native, free) |
| Calendar | Google Calendar API v3 |
| Email | Resend (free tier: 3k emails/mo) |
| Database | PostgreSQL + SQLAlchemy (local Docker / Supabase free tier) |
| Auth | Google OAuth 2.0 |

## Setup

### 1. Clone & Install

```bash
git clone <repo>
cd ai-meeting-scheduler

# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` in both `frontend/` and `backend/` directories.

**Backend `.env`:**

```text
GEMINI_API_KEY=AIzaSy...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/callback
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/meeting_scheduler
SECRET_KEY=your-secret-key-here
```

**Frontend `.env.local`:**

```text
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
```

### 3. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable **Google Calendar API**
3. Create OAuth 2.0 credentials (Web Application)
4. Add redirect URI: `http://localhost:8000/auth/callback`
5. Download credentials JSON

### 4. Database Setup

```bash
createdb meeting_scheduler
cd backend
alembic upgrade head
```

### 5. Run

```bash
# Terminal 1: Backend
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage

1. **Text input**: Type a natural language request like:
   > "Schedule a 30-minute sync with Priya Sharma tomorrow at 3 PM about Q4 planning"

2. **Voice input**: Click the mic button, speak your request, Web Speech API transcribes it directly in the browser

3. The **Gemini LLM Agent** extracts:
   - Attendee(s) name + email lookup
   - Date & time (resolved from relative expressions)
   - Duration
   - Meeting title/agenda

4. The agent **checks calendar availability** for all attendees

5. You review and **confirm** the meeting details

6. Calendar invites are created + **email notifications** sent via Resend

## Agent Rules

The scheduler agent will NOT proceed if:

- Attendee name cannot be resolved to an email
- No time/date is specified
- Requested slot is already occupied
- Duration is missing (defaults to 30 min if omitted but flagged)

## Project Structure

```text
ai-meeting-scheduler/
├── frontend/                 # Next.js app
│   ├── app/
│   │   ├── page.tsx          # Main chat UI
│   │   ├── meetings/         # Meeting history
│   │   └── api/              # Next.js API routes (proxy)
│   ├── components/
│   │   ├── ConfirmModal.tsx
│   │   ├── MeetingCard.tsx
│   │   └── VoiceRecorder.tsx
│   └── lib/
│       └── api.ts
├── backend/
│   ├── main.py               # FastAPI app entry
│   ├── routers/
│   │   ├── schedule.py       # POST /schedule
│   │   ├── meetings.py       # GET/DELETE /meetings
│   │   └── auth.py           # Google OAuth
│   ├── services/
│   │   ├── llm_agent.py      # Gemini agent logic
│   │   ├── calendar.py       # Google Calendar API
│   │   ├── email.py          # Resend integration
│   │   └── directory.py      # User/email lookup
│   ├── models/
│   │   └── database.py       # SQLAlchemy models
│   └── utils/
│       └── datetime_parser.py
└── docs/
    └── api.md
```

## Deployment Guide

### Frontend Deployment: Vercel

1. **Sign Up**: Create an account on [Vercel](https://vercel.com).
2. **Import Project**: Connect your GitHub repository and select the `frontend/` folder.
3. **Configure Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: Your deployed FastAPI backend URL on Render.
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Your Google OAuth client ID.
4. **Deploy**: Click **Deploy**. Vercel automatically builds and deploys your Next.js application.

### Backend Deployment: Render (Free Tier)

1. **Sign Up**: Create an account on [Render](https://render.com).
2. **Create Web Service**: Select **New** → **Web Service** and connect your GitHub repository.
3. **Configure Settings**:
   - **Root Directory**: `backend`
   - **Runtime**: `Docker` (Render automatically builds the backend using the existing `Dockerfile`).
   - **Plan**: `Free`
4. **Configure Environment Variables**:
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `RESEND_API_KEY`: Your Resend API Key.
   - `RESEND_FROM_EMAIL`: `onboarding@resend.dev` (or your verified custom domain).
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`: Your Google OAuth credentials.
   - `DATABASE_URL`: Your Supabase connection string.
   - `SECRET_KEY`: A secure long random string.
5. **Deploy**: Render will build the container and deploy your FastAPI service.

---

## Database Hosting: Supabase (Free Tier)

1. **Sign Up**: Create a free account on [Supabase](https://supabase.com).
2. **Create Project**: Click **New Project** and set up your PostgreSQL database.
3. **Get Connection String**:
   - Navigate to **Project Settings** → **Database**.
   - Copy the URI from the **Connection string** section (select the **Transaction** or **Session** mode pooler and set the protocol to `postgresql+asyncpg://...` format).
4. **Configure Environment Variable**: Assign this copied URI to your backend's `DATABASE_URL`.
