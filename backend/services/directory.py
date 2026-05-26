"""
services/directory.py
Resolve attendee names → emails using Google Directory API (Google Workspace).
Falls back to fuzzy matching against locally cached user DB.
"""

from typing import Optional, List
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from utils.config import settings
from models.database import User

logger = structlog.get_logger()


async def resolve_attendee_email(
    name: str,
    db: AsyncSession,
    access_token: Optional[str] = None,
) -> Optional[str]:
    """
    Attempt to resolve a person's name to their work email.

    Resolution order:
    1. Google Workspace Directory API (if access_token provided)
    2. Local users table (partial name match)
    3. Fallback: name@org_domain (last resort, only if single-word name not provided)
    """
    # 1. Google Workspace Directory
    if access_token:
        email = await _query_google_directory(name, access_token)
        if email:
            return email

    # 2. Local DB fuzzy match
    email = await _query_local_directory(name, db)
    if email:
        return email

    # 3. Derive email from name + org domain (heuristic)
    derived = _derive_email_from_name(name)
    if derived:
        logger.warning("Using derived email — could be wrong", name=name, derived=derived)
        return derived

    return None


async def _query_google_directory(name: str, access_token: str) -> Optional[str]:
    """Search Google Workspace Directory for a person by name."""
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        from utils.config import settings

        creds = Credentials(token=access_token)
        service = build("admin", "directory_v1", credentials=creds)

        result = service.users().list(
            customer="my_customer",
            query=f"name:{name}",
            maxResults=5,
            orderBy="email",
        ).execute()

        users = result.get("users", [])
        if users:
            primary_email = users[0].get("primaryEmail")
            logger.info("Resolved via Google Directory", name=name, email=primary_email)
            return primary_email

    except Exception as e:
        logger.warning("Google Directory lookup failed", name=name, error=str(e))

    return None


async def _query_local_directory(name: str, db: AsyncSession) -> Optional[str]:
    """Search local users table for a partial name match."""
    try:
        # Case-insensitive partial match
        stmt = select(User).where(User.name.ilike(f"%{name}%"))
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if user:
            logger.info("Resolved via local DB", name=name, email=user.email)
            return user.email
    except Exception as e:
        logger.warning("Local directory lookup failed", error=str(e))
    return None


def _derive_email_from_name(name: str) -> Optional[str]:
    """
    Last-resort: convert 'John Smith' → 'john.smith@company.com'
    Only reliable for well-formatted full names.
    """
    parts = name.strip().lower().split()
    if len(parts) >= 2:
        email = f"{'.'.join(parts)}@{settings.ORG_DOMAIN}"
        return email
    return None


async def resolve_all_attendees(
    attendees: List[dict],
    db: AsyncSession,
    access_token: Optional[str] = None,
) -> tuple[List[dict], List[str]]:
    """
    Resolve emails for all attendees.
    
    Returns:
        (resolved_attendees, unresolved_names)
        where resolved_attendees have guaranteed email fields.
    """
    resolved = []
    unresolved = []

    for attendee in attendees:
        name = attendee.get("name", "")
        email = attendee.get("email")

        if not email:
            email = await resolve_attendee_email(name, db, access_token)

        if email:
            resolved.append({"name": name, "email": email})
        else:
            unresolved.append(name)

    return resolved, unresolved
