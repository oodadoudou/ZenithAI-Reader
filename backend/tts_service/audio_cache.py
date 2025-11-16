"""Audio cache helpers: filenames, index management, and metadata tracking."""

from __future__ import annotations

import json
import re
import threading
from functools import lru_cache
from hashlib import sha1
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import HTTPException, status

from .settings import Settings, get_settings

CACHE_FILENAME_PATTERN = re.compile(r"^[a-f0-9]{12}-[A-Za-z0-9_-]+\.wav$", re.IGNORECASE)


def build_cache_key(parts: List[str]) -> str:
  digest = sha1("|".join(parts).encode("utf-8")).hexdigest()
  return digest[:12]


def sanitize_voice_id(voice_id: str) -> str:
  sanitized = re.sub(r"[^A-Za-z0-9_-]", "-", voice_id).strip("-")
  return sanitized or "voice"


def resolve_cache_path(settings: Settings, filename: str) -> Path:
  if not CACHE_FILENAME_PATTERN.fullmatch(filename):
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid cache filename")
  candidate = (settings.media_dir / filename).resolve()
  try:
    candidate.relative_to(settings.media_dir)
  except ValueError:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="filename outside media directory")
  return candidate


class AudioIndex:
  """Persists the mapping of book_id → cached filenames for cleanup."""

  def __init__(self, path: Path):
    self.path = path
    self._lock = threading.Lock()
    self._ensure_store()

  def _ensure_store(self) -> None:
    if not self.path.exists():
      self.path.write_text(json.dumps({"by_book": {}}, indent=2))

  def _load(self) -> Dict[str, List[str]]:
    try:
      data = json.loads(self.path.read_text())
    except FileNotFoundError:
      data = {"by_book": {}}
    return data.get("by_book", {})

  def _save(self, content: Dict[str, List[str]]) -> None:
    self.path.write_text(json.dumps({"by_book": content}, indent=2))

  def add(self, book_id: Optional[str], filename: str) -> None:
    if not book_id:
      return
    with self._lock:
      data = self._load()
      entries = data.setdefault(book_id, [])
      if filename not in entries:
        entries.append(filename)
        self._save(data)

  def remove(self, filename: str) -> None:
    with self._lock:
      data = self._load()
      changed = False
      for book_id, files in list(data.items()):
        if filename in files:
          files.remove(filename)
          changed = True
        if not files:
          data.pop(book_id, None)
      if changed:
        self._save(data)

  def pop_files_for_book(self, book_id: str) -> List[str]:
    with self._lock:
      data = self._load()
      files = data.pop(book_id, [])
      self._save(data)
      return files


@lru_cache(maxsize=1)
def get_audio_index() -> AudioIndex:
  settings = get_settings()
  return AudioIndex(settings.audio_index_file)
