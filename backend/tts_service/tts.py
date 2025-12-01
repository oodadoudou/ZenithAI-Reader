"""Offline and online TTS helpers."""

from __future__ import annotations

import logging
import os
import subprocess
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import httpx
from fastapi import HTTPException, status
from pydantic import BaseModel, Field

from .audio_cache import (
    AudioIndex,
    build_cache_key,
    get_audio_index,
    resolve_cache_path,
    sanitize_voice_id,
)
from .settings import Settings

LOGGER = logging.getLogger(__name__)


class TTSRequest(BaseModel):
  text: str = Field(..., min_length=1)
  voice_id: str = Field(..., min_length=1)
  rate: Optional[float] = None
  pitch: Optional[float] = None
  book_id: Optional[str] = None


@dataclass
class SynthesisResult:
  file_path: Path
  audio_url: str
  duration_ms: Optional[int]
  filename: str


def _read_wav_duration_ms(file_path: Path) -> Optional[int]:
  try:
    with wave.open(str(file_path), "rb") as wav_file:
      frames = wav_file.getnframes()
      framerate = wav_file.getframerate()
  except (wave.Error, FileNotFoundError):
    LOGGER.warning("Unable to read WAV duration for %%s", file_path)
    return None
  if framerate:
    return int(frames / framerate * 1000)
  return None


def write_stub_wav(target: Path) -> int:
  target.parent.mkdir(parents=True, exist_ok=True)
  framerate = 22050
  duration_seconds = 0.5
  frames = int(framerate * duration_seconds)
  silence_frame = (0).to_bytes(2, byteorder="little", signed=True)
  with wave.open(str(target), "wb") as wav_file:
    wav_file.setnchannels(1)
    wav_file.setsampwidth(2)
    wav_file.setframerate(framerate)
    wav_file.writeframes(silence_frame * frames)
  return int(duration_seconds * 1000)


def _voice_model_path(settings: Settings, voice_id: str) -> str:
  alias_target = settings.voice_aliases.get(voice_id, voice_id)
  voice_path = Path(alias_target)
  base_dir: Optional[Path] = None
  if not voice_path.is_absolute():
    base_dir = settings.voice_dir
    voice_path = base_dir / voice_path
  if voice_path.exists():
    return str(voice_path)
  if base_dir and not voice_path.suffix:
    for suffix in (".onnx", ".bin", ".pt"):
      candidate = voice_path.with_suffix(suffix)
      if candidate.exists():
        return str(candidate)
  return str(voice_path)


def _run_piper(settings: Settings, payload: TTSRequest, output_path: Path) -> Optional[int]:
  if not (settings.piper_bin and settings.piper_bin.exists()):
    return write_stub_wav(output_path)

  tmp_path = output_path.with_suffix(".tmp")
  cmd = [
      str(settings.piper_bin),
      "--model",
      _voice_model_path(settings, payload.voice_id),
      "--output_file",
      str(tmp_path),
  ]
  env = os.environ.copy()
  if payload.rate is not None:
    env["PIPER_RATE"] = str(payload.rate)
  if payload.pitch is not None:
    env["PIPER_PITCH"] = str(payload.pitch)

  try:
    subprocess.run(cmd, input=payload.text.encode("utf-8"), check=True, env=env)
    tmp_path.replace(output_path)
    return _read_wav_duration_ms(output_path)
  except Exception as exc:  # pragma: no cover - fallback path
    LOGGER.warning("Piper invocation failed, falling back to stub: %s", exc)
    if tmp_path.exists():
      tmp_path.unlink(missing_ok=True)
    return write_stub_wav(output_path)


def synthesize(settings: Settings, payload: TTSRequest) -> SynthesisResult:
  payload_parts = [
      payload.voice_id,
      "" if payload.rate is None else str(payload.rate),
      "" if payload.pitch is None else str(payload.pitch),
      payload.text,
  ]
  cache_key = build_cache_key(payload_parts)
  filename = f"{cache_key}-{sanitize_voice_id(payload.voice_id)}.wav"
  file_path = settings.media_dir / filename
  duration_ms: Optional[int] = None
  if not file_path.exists():
    duration_ms = _run_piper(settings, payload, file_path)
  if duration_ms is None:
    duration_ms = _read_wav_duration_ms(file_path)
  audio_url = f"{settings.media_url_prefix}/{filename}"

  audio_index = get_audio_index()
  audio_index.add(payload.book_id, filename)
  return SynthesisResult(file_path=file_path, audio_url=audio_url, duration_ms=duration_ms, filename=filename)


def forward_online_tts(settings: Settings, payload: TTSRequest) -> dict:
  if not settings.enable_online_proxy or not settings.online_tts_base_url:
    raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="online proxy disabled")

  endpoint = settings.online_tts_base_url.rstrip("/") + "/tts/generate"
  headers = {"Content-Type": "application/json"}
  if settings.online_tts_api_key:
    headers["Authorization"] = f"Bearer {settings.online_tts_api_key}"

  with httpx.Client(timeout=30) as client:
    upstream = client.post(endpoint, json=payload.model_dump(exclude_none=True), headers=headers)
  if upstream.status_code >= 400:
    raise HTTPException(status_code=upstream.status_code, detail=upstream.text)
  data = upstream.json()
  return {"audio_url": data.get("audio_url"), "duration_ms": data.get("duration_ms")}


def delete_cache_file(settings: Settings, filename: str) -> bool:
  audio_index = get_audio_index()
  file_path = resolve_cache_path(settings, filename)
  if file_path.exists():
    file_path.unlink()
    audio_index.remove(filename)
    return True
  return False


def remove_cached_audio_for_book(settings: Settings, book_id: str) -> int:
  audio_index = get_audio_index()
  removed = 0
  for filename in audio_index.pop_files_for_book(book_id):
    file_path = resolve_cache_path(settings, filename)
    if file_path.exists():
      file_path.unlink()
      removed += 1
  return removed
