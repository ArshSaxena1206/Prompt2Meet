"""services/whisper.py — OpenAI Whisper speech-to-text transcription"""

import tempfile
import os
from openai import AsyncOpenAI
import structlog

from utils.config import settings

logger = structlog.get_logger()
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

SUPPORTED_FORMATS = {".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm", ".ogg"}


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> dict:
    """
    Transcribe audio bytes using OpenAI Whisper API.
    
    Returns:
        {
          "text": "transcribed text",
          "language": "en",
          "duration": 4.2
        }
    """
    ext = os.path.splitext(filename)[1].lower()
    if ext not in SUPPORTED_FORMATS:
        ext = ".webm"  # Default for browser MediaRecorder output

    # Write to temp file (Whisper API requires a file-like object)
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as audio_file:
            response = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
                language="en",  # Hint to improve accuracy; remove for auto-detect
            )

        logger.info("Transcription complete",
                    text_preview=response.text[:60],
                    duration=getattr(response, "duration", None))

        return {
            "text": response.text,
            "language": getattr(response, "language", "en"),
            "duration": getattr(response, "duration", None),
        }

    except Exception as e:
        logger.error("Whisper transcription failed", error=str(e))
        raise RuntimeError(f"Transcription failed: {str(e)}")

    finally:
        os.unlink(tmp_path)
