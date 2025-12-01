"""Environment-driven settings for the PaperRead backend."""

from __future__ import annotations

import json
import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field


def _bool_env(value: Optional[str], default: bool = False) -> bool:
  if value is None:
    return default
  return value.lower() in {"1", "true", "yes", "on"}


LOGGER = logging.getLogger(__name__)


class Settings(BaseModel):
  media_dir: Path
  media_url_prefix: str = "/media"
  audio_index_file: Path
  books_dir: Path
  library_metadata_file: Path
  piper_bin: Optional[Path] = None
  voice_dir: Path
  voice_aliases: dict[str, str] = Field(default_factory=dict)
  max_chars: int = 5000
  max_upload_bytes: int = 25 * 1024 * 1024
  enable_online_proxy: bool = False
  online_tts_base_url: Optional[str] = None
  online_tts_api_key: Optional[str] = None
  request_limit: int = 60
  request_window_seconds: int = 60
  voice_manifest_path: Optional[Path] = None
  voice_manifest_json: Optional[str] = None
  voice_download_base_url: Optional[str] = None
  voice_download_timeout: int = 60

  class Config:
    arbitrary_types_allowed = True

  @classmethod
  def from_env(cls) -> "Settings":
    media_dir = Path(os.environ.get("MEDIA_DIR", "/data/media")).expanduser()
    books_dir = Path(os.environ.get("BOOKS_DIR", "/data/books")).expanduser()
    media_dir.mkdir(parents=True, exist_ok=True)
    books_dir.mkdir(parents=True, exist_ok=True)

    def _path_from_env(name: str) -> Optional[Path]:
      value = os.environ.get(name)
      return Path(value).expanduser().resolve() if value else None

    max_chars = int(os.environ.get("MAX_CHARS", "5000"))
    max_upload_bytes = int(os.environ.get("MAX_UPLOAD_BYTES", str(25 * 1024 * 1024)))
    request_limit = int(os.environ.get("REQUEST_LIMIT", "60"))
    request_window = int(os.environ.get("REQUEST_WINDOW_SECONDS", "60"))
    aliases_raw = os.environ.get("VOICE_ALIASES")
    voice_aliases: dict[str, str] = {}
    if aliases_raw:
      try:
        parsed = json.loads(aliases_raw)
        if isinstance(parsed, dict):
          voice_aliases = {str(key): str(value) for key, value in parsed.items()}
      except json.JSONDecodeError:
        LOGGER.warning("Invalid VOICE_ALIASES JSON; ignoring")

    voice_dir = _path_from_env("VOICE_DIR") or (media_dir / "voices")
    voice_dir.mkdir(parents=True, exist_ok=True)

    settings = cls(
        media_dir=media_dir.resolve(),
        books_dir=books_dir.resolve(),
        audio_index_file=(media_dir / "audio_index.json"),
        library_metadata_file=(books_dir / "library.json"),
        piper_bin=_path_from_env("PIPER_BIN"),
        voice_dir=voice_dir.resolve(),
        voice_aliases=voice_aliases,
        max_chars=max_chars,
        max_upload_bytes=max_upload_bytes,
        enable_online_proxy=_bool_env(os.environ.get("ENABLE_ONLINE_PROXY"), False),
        online_tts_base_url=os.environ.get("ONLINE_TTS_BASE_URL"),
        online_tts_api_key=os.environ.get("ONLINE_TTS_API_KEY"),
        request_limit=request_limit,
        request_window_seconds=request_window,
        voice_manifest_path=_path_from_env("VOICE_MANIFEST_PATH"),
        voice_manifest_json=os.environ.get("VOICE_MANIFEST_JSON"),
        voice_download_base_url=os.environ.get("VOICE_DOWNLOAD_BASE_URL"),
        voice_download_timeout=int(os.environ.get("VOICE_DOWNLOAD_TIMEOUT", "60")),
    )
    settings.audio_index_file.parent.mkdir(parents=True, exist_ok=True)
    settings.library_metadata_file.parent.mkdir(parents=True, exist_ok=True)
    return settings


@lru_cache(maxsize=1)
def get_settings() -> Settings:
  return Settings.from_env()
