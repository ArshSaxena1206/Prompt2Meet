"""
AI Meeting Scheduler — FastAPI Backend
main.py — Application entry point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog

from routers import schedule, meetings, auth
from models.database import init_db
from utils.config import settings

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("Starting AI Meeting Scheduler", env=settings.ENVIRONMENT)
    await init_db()
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="AI Meeting Scheduler",
    description="Schedule meetings via natural language prompts with Google Calendar integration.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,       prefix="/auth",       tags=["auth"])
app.include_router(schedule.router,   prefix="/schedule",   tags=["schedule"])
app.include_router(meetings.router,   prefix="/meetings",   tags=["meetings"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
