"""tts_service exposes the FastAPI application and related helpers."""

from .main import app  # re-export for uvicorn discovery

__all__ = ["app"]
