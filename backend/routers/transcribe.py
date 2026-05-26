"""routers/transcribe.py — POST /transcribe — audio → text via Whisper"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import structlog

from services.whisper import transcribe_audio

logger = structlog.get_logger()
router = APIRouter()


class TranscribeResponse(BaseModel):
    text: str
    language: str
    duration: float | None = None


@router.post("/", response_model=TranscribeResponse)
async def transcribe(file: UploadFile = File(...)):
    """
    Accept an audio file (webm, wav, mp3, m4a) and return the transcription.
    
    The frontend records audio via the MediaRecorder API and uploads it here.
    The transcribed text is then piped directly into the /schedule/parse endpoint.
    """
    if file.size and file.size > 25 * 1024 * 1024:  # 25MB Whisper limit
        raise HTTPException(status_code=413, detail="Audio file too large (max 25MB)")

    audio_bytes = await file.read()

    try:
        result = await transcribe_audio(audio_bytes, filename=file.filename or "audio.webm")
        return TranscribeResponse(**result)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
