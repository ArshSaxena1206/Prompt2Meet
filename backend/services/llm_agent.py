"""
services/llm_agent.py
Gemini-powered agent that converts natural language → structured meeting JSON.

Agent Rules (ENFORCED):
  1. Must identify at least one attendee resolvable to an email.
  2. Must have a specific date/time (relative expressions like "tomorrow" are resolved).
  3. Must have a duration (defaults to 30 min if omitted, but must be flagged).
  4. Will NOT book if requested slot is already occupied.
  5. Will ask clarifying questions if info is ambiguous or missing.
"""

import json
from datetime import datetime
from typing import Optional
import google.generativeai as genai
import structlog

from utils.config import settings

logger = structlog.get_logger()
genai.configure(api_key=settings.GEMINI_API_KEY)

SYSTEM_PROMPT = """You are an intelligent meeting scheduling assistant for a corporate organization.

Your job is to extract structured meeting details from user prompts.

Current datetime (ISO): {current_datetime}
Timezone: {timezone}

## Output Format
Always respond with ONLY a JSON object. No prose, no markdown fences.

### Case 1 — Enough information to schedule:
{{
  "status": "ready",
  "title": "Meeting title",
  "attendees": [
    {{"name": "Full Name", "email": "email@company.com"}}
  ],
  "start_datetime": "2024-06-15T14:00:00",
  "end_datetime": "2024-06-15T14:30:00",
  "agenda": "Optional agenda/description",
  "duration_minutes": 30,
  "confidence": 0.95
}}

### Case 2 — Missing critical information:
{{
  "status": "needs_info",
  "missing_fields": ["attendee_email", "date_time"],
  "clarifying_question": "I couldn't find an email for 'John'. Could you provide John's full name or email address?",
  "partial": {{
    "title": "What we know so far...",
    "duration_minutes": 30
  }}
}}

### Case 3 — Cannot schedule (conflict or unresolvable):
{{
  "status": "error",
  "reason": "The requested time slot conflicts with an existing meeting.",
  "suggestion": "The next available slot is tomorrow at 10:00 AM."
}}

## Rules you MUST follow:
- If the attendee name is given but no email, set email to null — the backend will resolve it from the directory.
- If no duration is specified, default to 30 minutes and note it in the response.
- Resolve relative time expressions ("tomorrow", "next Monday", "in 2 hours") using the current_datetime provided.
- If the request is completely unrelated to scheduling, respond with {{"status": "error", "reason": "This request is not related to meeting scheduling."}}
- Extract the meeting agenda/purpose if mentioned.
- Never fabricate email addresses. Use null if unknown.
"""


async def extract_meeting_intent(
    prompt: str,
    timezone: str = "Asia/Kolkata",
    conversation_history: Optional[list] = None
) -> dict:
    """
    Send user prompt to Gemini 1.5 Flash and get structured meeting details back.

    Returns a dict with status: 'ready' | 'needs_info' | 'error'
    """
    current_datetime = datetime.now().isoformat(timespec="minutes")

    system = SYSTEM_PROMPT.format(
        current_datetime=current_datetime,
        timezone=timezone
    )

    contents = []
    if conversation_history:
        for msg in conversation_history:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [msg["content"]]})

    contents.append({"role": "user", "parts": [prompt]})

    try:
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system
        )

        response = await model.generate_content_async(
            contents,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.1,
            )
        )

        result = json.loads(response.text)

        logger.info(
            "LLM extraction complete",
            status=result.get("status"),
            prompt_preview=prompt[:80],
        )

        return result

    except json.JSONDecodeError as e:
        logger.error("LLM returned invalid JSON", error=str(e))
        return {
            "status": "error",
            "reason": "The AI returned an unexpected response format. Please try again.",
        }
    except Exception as e:
        logger.error("LLM extraction failed", error=str(e))
        return {
            "status": "error",
            "reason": f"Failed to parse your request. Please try rephrasing. ({str(e)})",
        }


async def generate_meeting_title(prompt: str) -> str:
    """Generate a clean, professional meeting title from raw prompt."""
    try:
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction="Generate a concise, professional meeting title (max 8 words) from the user's prompt. Return only the title, nothing else."
        )
        response = await model.generate_content_async(prompt)
        return response.text.strip().strip('"')
    except Exception as e:
        logger.error("Failed to generate meeting title", error=str(e))
        return "Meeting Sync"
