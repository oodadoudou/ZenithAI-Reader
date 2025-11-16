"""Book upload, listing, and deletion helpers."""

from __future__ import annotations

import hashlib
import json
import time
import uuid
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, UploadFile, status

from .settings import Settings
from .tts import remove_cached_audio_for_book

ALLOWED_EXTENSIONS = {".epub", ".txt"}
ALLOWED_CONTENT_TYPES = {"application/epub+zip", "application/x-zip-compressed", "text/plain", "application/octet-stream"}


def _validate_last_read_location(value: Any) -> Optional[Dict[str, int]]:
  if value is None:
    return None
  if not isinstance(value, dict):
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="last_read_location must be an object")
  para = value.get("para")
  chars = value.get("chars")
  if not isinstance(para, int) or para < 0:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="para must be a non-negative integer")
  if not isinstance(chars, int) or chars < 0:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="chars must be a non-negative integer")
  return {"para": para, "chars": chars}


class LibraryStore:
  def __init__(self, settings: Settings):
    self.settings = settings
    self.metadata_file = settings.library_metadata_file
    self.books_dir = settings.books_dir
    self._lock = Lock()
    self.metadata_file.touch(exist_ok=True)

  def _load(self) -> List[Dict]:
    content = self.metadata_file.read_text().strip()
    if not content:
      return []
    return json.loads(content)

  def _save(self, entries: List[Dict]) -> None:
    self.metadata_file.write_text(json.dumps(entries, indent=2))

  def list_books(self) -> List[Dict]:
    return self._load()

  def get_entry(self, book_id: str) -> Optional[Dict]:
    for entry in self._load():
      if entry["id"] == book_id:
        return entry
    return None

  def delete_book(self, book_id: str) -> Dict:
    with self._lock:
      entries = self._load()
      remaining = []
      deleted_entry = None
      for entry in entries:
        if entry["id"] == book_id:
          deleted_entry = entry
        else:
          remaining.append(entry)
      if not deleted_entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="book not found")
      file_path = self.books_dir / deleted_entry["filename"]
      file_path.unlink(missing_ok=True)
      self._save(remaining)
    remove_cached_audio_for_book(self.settings, book_id)
    return deleted_entry

  def store_upload(self, upload: UploadFile, title: Optional[str], author: Optional[str], cover: Optional[str]) -> Dict:
    extension = Path(upload.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unsupported file type")
    content_type = upload.content_type or "application/octet-stream"
    if content_type not in ALLOWED_CONTENT_TYPES:
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unsupported content type")

    hasher = hashlib.sha1()
    total_bytes = 0
    tmp_path = self.books_dir / f"upload-{uuid.uuid4().hex}{extension}"
    with tmp_path.open("wb") as destination:
      while True:
        chunk = upload.file.read(1024 * 1024)
        if not chunk:
          break
        total_bytes += len(chunk)
        if total_bytes > self.settings.max_upload_bytes:
          destination.close()
          tmp_path.unlink(missing_ok=True)
          raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="upload exceeds limit")
        hasher.update(chunk)
        destination.write(chunk)
    final_filename = f"{hasher.hexdigest()}{extension}"
    final_path = self.books_dir / final_filename
    if final_path.exists():
      tmp_path.unlink(missing_ok=True)
    else:
      tmp_path.rename(final_path)
    book_id = uuid.uuid4().hex
    entry = {
        "id": book_id,
        "title": title or (Path(upload.filename or final_filename).stem),
        "author": author,
        "filename": final_filename,
        "content_type": content_type,
        "file_size": total_bytes,
        "added_at": int(time.time()),
        "cover": cover,
        "last_read_location": None,
    }
    with self._lock:
      entries = self._load()
      entries.append(entry)
      self._save(entries)
    return entry

  def update_book(self, book_id: str, updates: Dict[str, Any]) -> Dict:
    allowed_keys = {"title", "author", "cover", "last_read_location"}
    unknown = set(updates.keys()) - allowed_keys
    if unknown:
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"unsupported fields: {', '.join(sorted(unknown))}")
    if "last_read_location" in updates:
      updates["last_read_location"] = _validate_last_read_location(updates["last_read_location"])
    with self._lock:
      entries = self._load()
      updated_entry = None
      for entry in entries:
        if entry["id"] == book_id:
          updated_entry = entry
          break
      if not updated_entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="book not found")
      updated_entry.update({k: v for k, v in updates.items() if v is not None or k in {"last_read_location", "cover"}})
      updated_entry["updated_at"] = int(time.time())
      self._save(entries)
    return updated_entry
