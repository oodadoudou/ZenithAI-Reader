"""FastAPI entrypoint wiring TTS, library, and observability."""

from __future__ import annotations

import json
import logging
import time
from functools import lru_cache
from typing import Optional

from fastapi import (
    FastAPI,
    File,
    HTTPException,
    Path,
    Query,
    Request,
    UploadFile,
    status,
    Form,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from .library import LibraryStore
from .rate_limit import enforce_rate_limit
from .settings import Settings, get_settings
from .system import get_system_status
from .tts import TTSRequest, delete_cache_file, forward_online_tts, synthesize
from .voices import download_voice_pack, list_voices

class LastReadLocation(BaseModel):
  para: int
  chars: int


class BookUpdate(BaseModel):
  model_config = ConfigDict(extra="allow")
  title: Optional[str] = None
  author: Optional[str] = None
  cover: Optional[str] = None
  last_read_location: Optional[LastReadLocation] = None


class VoiceDownloadRequest(BaseModel):
  voice_id: str = Field(..., min_length=1)


LOGGER = logging.getLogger(__name__)


def _get_status_label(piper_available: bool, settings: Settings) -> str:
  if settings.piper_bin and not piper_available:
    return "degraded"
  return "ok"


@lru_cache(maxsize=1)
def get_library_store() -> LibraryStore:
  return LibraryStore(get_settings())


app = FastAPI(title="PaperRead TTS Service", version="0.3.0")

# Add CORS middleware to allow frontend access from different origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins like ["http://localhost:8080"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def logging_and_rate_limit(request: Request, call_next):
  client_ip = request.client.host if request.client else "unknown"
  try:
    enforce_rate_limit(client_ip)
  except HTTPException as exc:
    LOGGER.warning(
        json.dumps(
            {
                "event": "rate_limit",
                "path": request.url.path,
                "method": request.method,
                "client_ip": client_ip,
                "status_code": exc.status_code,
            }
        )
    )
    response = JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    response.headers["x-request-duration-ms"] = "0.00"
    return response
  start = time.perf_counter()
  try:
    response = await call_next(request)
  except Exception as exc:  # pragma: no cover - logging path
    duration_ms = (time.perf_counter() - start) * 1000
    LOGGER.exception(
        "request_failed",
        extra={
            "path": request.url.path,
            "method": request.method,
            "client_ip": client_ip,
            "duration_ms": duration_ms,
            "error": str(exc),
        },
    )
    raise
  duration_ms = (time.perf_counter() - start) * 1000
  response.headers["x-request-duration-ms"] = f"{duration_ms:.2f}"
  LOGGER.info(
      json.dumps(
          {
              "event": "request",
              "path": request.url.path,
              "method": request.method,
              "status_code": response.status_code,
              "duration_ms": round(duration_ms, 2),
              "client_ip": client_ip,
          }
      )
  )
  return response


@app.get("/healthz", tags=["health"])
def healthz() -> dict:
  return {"status": "ok"}


@app.get("/readyz", tags=["health"])
def readyz() -> dict:
  settings = get_settings()
  piper_available = bool(settings.piper_bin and settings.piper_bin.exists())
  return {"status": _get_status_label(piper_available, settings), "piper_available": piper_available}


@app.post("/tts", tags=["tts"])
def create_tts(payload: TTSRequest, json: int = Query(default=0, alias="json")):
  settings = get_settings()
  if len(payload.text) > settings.max_chars:
    raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="text exceeds MAX_CHARS")
  result = synthesize(settings, payload)
  if json:
    return JSONResponse({"audio_url": result.audio_url, "duration_ms": result.duration_ms})
  return FileResponse(result.file_path, media_type="audio/wav", filename=result.filename)


@app.post("/tts/generate", tags=["tts"])
def create_online_tts(payload: TTSRequest):
  settings = get_settings()
  normalized = forward_online_tts(settings, payload)
  return JSONResponse(normalized)


@app.get("/voices", tags=["voices"])
def get_voices():
  settings = get_settings()
  return {"voices": list_voices(settings)}


@app.post("/voices/download", tags=["voices"])
def download_voice(payload: VoiceDownloadRequest):
  settings = get_settings()
  return download_voice_pack(settings, payload.voice_id)


@app.delete("/tts/cache/{filename}", tags=["tts"])
def delete_cache(filename: str = Path(..., description="Cached audio filename")):
  settings = get_settings()
  deleted = delete_cache_file(settings, filename)
  return {"deleted": deleted}


@app.post("/library/upload", tags=["library"])
def upload_book(
    file: UploadFile = File(...),
    title: Optional[str] = Form(default=None),
    author: Optional[str] = Form(default=None),
    cover: Optional[str] = Form(default=None),
):
  store = get_library_store()
  return store.store_upload(file, title, author, cover)


@app.get("/library", tags=["library"])
def list_library():
  store = get_library_store()
  return store.list_books()


@app.get("/library/{book_id}", tags=["library"])
def get_book(book_id: str = Path(...)):
  store = get_library_store()
  entry = store.get_entry(book_id)
  if not entry:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="book not found")
  file_path = store.books_dir / entry["filename"]
  if not file_path.exists():
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="book missing on disk")
  return FileResponse(file_path, media_type=entry.get("content_type") or "application/octet-stream", filename=file_path.name)


@app.delete("/library/{book_id}", tags=["library"])
def delete_book(book_id: str = Path(...)):
  store = get_library_store()
  entry = store.delete_book(book_id)
  return {"deleted": True, "book": entry}


@app.patch("/library/{book_id}", tags=["library"])
def update_book_entry(payload: BookUpdate, book_id: str = Path(...)):
  store = get_library_store()
  entry = store.update_book(book_id, payload.model_dump(exclude_unset=True))
  return entry


@app.get("/status", tags=["system"])
def status_overview():
  settings = get_settings()
  return get_system_status(settings)
