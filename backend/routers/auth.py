"""routers/auth.py — Google OAuth 2.0 flow"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
import structlog

from utils.config import settings

logger = structlog.get_logger()
router = APIRouter()

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
    # Uncomment if using Google Workspace Directory API:
    # "https://www.googleapis.com/auth/admin.directory.user.readonly",
]


def _get_flow() -> Flow:
    return Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
            }
        },
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
    )


@router.get("/login")
async def login():
    """Redirect user to Google OAuth consent screen."""
    flow = _get_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return RedirectResponse(url=auth_url)


@router.get("/callback")
async def callback(code: str, state: str = None):
    """Handle Google OAuth callback, exchange code for tokens."""
    flow = _get_flow()
    try:
        flow.fetch_token(code=code)
        creds = flow.credentials

        # Return tokens to frontend (in production: use httpOnly cookies or session)
        return {
            "access_token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_expiry": creds.expiry.isoformat() if creds.expiry else None,
        }
    except Exception as e:
        logger.error("OAuth callback failed", error=str(e))
        raise HTTPException(status_code=400, detail=f"OAuth failed: {str(e)}")


@router.post("/refresh")
async def refresh_token(refresh_token: str):
    """Exchange a refresh token for a new access token."""
    import google.oauth2.credentials
    import google.auth.transport.requests

    creds = google.oauth2.credentials.Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
    )
    request = google.auth.transport.requests.Request()
    creds.refresh(request)
    return {"access_token": creds.token}
