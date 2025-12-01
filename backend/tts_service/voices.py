"""Voice catalog management plus download helpers."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List

import httpx
from fastapi import HTTPException, status

from .settings import Settings

LOGGER = logging.getLogger(__name__)

DEFAULT_VOICE_CATALOG: List[Dict[str, Any]] = [
    {
        'id': 'en_US',
        'name': 'English (US) — Female',
        'language': 'en-US',
        'gender': 'female',
        'size_mb': 48,
        'sample_url': None,
        'download_url': 'https://voice.paperread.example/en_US.onnx',
        'filename': 'en_US.onnx',
    },
    {
        'id': 'en_GB',
        'name': 'English (UK) — Male',
        'language': 'en-GB',
        'gender': 'male',
        'size_mb': 52,
        'sample_url': None,
        'download_url': 'https://voice.paperread.example/en_GB.onnx',
        'filename': 'en_GB.onnx',
    },
    {
        'id': 'es_ES',
        'name': 'Español — Narrador',
        'language': 'es-ES',
        'gender': 'female',
        'size_mb': 50,
        'sample_url': None,
        'download_url': 'https://voice.paperread.example/es_ES.onnx',
        'filename': 'es_ES.onnx',
    },
    {
        'id': 'zh_CN_female',
        'name': '中文 · 女声',
        'language': 'zh-CN',
        'gender': 'female',
        'size_mb': 62,
        'sample_url': None,
        'download_url': 'https://voice.paperread.example/zh_CN_female.onnx',
        'filename': 'zh_CN_female.onnx',
    },
]


def _parse_manifest(raw: str) -> List[Dict[str, Any]]:
  try:
    data = json.loads(raw)
  except json.JSONDecodeError:
    LOGGER.warning('Invalid voice manifest JSON; falling back to defaults')
    return []
  if isinstance(data, dict):
    data = data.get('voices', [])
  if not isinstance(data, list):
    LOGGER.warning('Voice manifest must be a list; falling back to defaults')
    return []
  normalized: List[Dict[str, Any]] = []
  for entry in data:
    if isinstance(entry, dict) and entry.get('id'):
      normalized.append(entry)
  return normalized


def _load_manifest(settings: Settings) -> List[Dict[str, Any]]:
  if settings.voice_manifest_path and settings.voice_manifest_path.exists():
    try:
      return _parse_manifest(settings.voice_manifest_path.read_text()) or [dict(item) for item in DEFAULT_VOICE_CATALOG]
    except OSError:
      LOGGER.warning('Unable to read voice manifest file %s', settings.voice_manifest_path)
  if settings.voice_manifest_json:
    parsed = _parse_manifest(settings.voice_manifest_json)
    if parsed:
      return parsed
  return [dict(item) for item in DEFAULT_VOICE_CATALOG]


def _voice_file_path(settings: Settings, entry: Dict[str, Any]) -> Path:
  filename = entry.get('filename') or f"{entry['id']}.onnx"
  return settings.voice_dir / filename


def list_voices(settings: Settings) -> List[Dict[str, Any]]:
  catalog = _load_manifest(settings)
  voices: List[Dict[str, Any]] = []
  for entry in catalog:
    voice_id = entry['id']
    file_path = _voice_file_path(settings, entry)
    voices.append(
        {
            'id': voice_id,
            'name': entry.get('name') or voice_id,
            'language': entry.get('language') or 'und',
            'gender': entry.get('gender'),
            'sample_url': entry.get('sample_url'),
            'size_mb': entry.get('size_mb'),
            'installed': file_path.exists(),
        }
    )
  return voices


def _resolve_download_url(settings: Settings, entry: Dict[str, Any]) -> str:
  url = entry.get('download_url')
  if not url:
    relative = entry.get('filename')
    base = settings.voice_download_base_url
    if relative and base:
      base = base.rstrip('/')
      return f"{base}/{relative.lstrip('/')}"
    return ''
  if url.startswith(('http://', 'https://')):
    return url
  if settings.voice_download_base_url:
    base = settings.voice_download_base_url.rstrip('/')
    return f"{base}/{url.lstrip('/')}"
  return ''


def _get_entry(settings: Settings, voice_id: str) -> Dict[str, Any]:
  for entry in _load_manifest(settings):
    if entry.get('id') == voice_id:
      return entry
  raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='voice not found')


def download_voice_pack(settings: Settings, voice_id: str) -> Dict[str, Any]:
  entry = _get_entry(settings, voice_id)
  target = _voice_file_path(settings, entry)
  if target.exists():
    return {'status': 'ready', 'voice_id': voice_id, 'size_mb': entry.get('size_mb'), 'installed': True}
  url = _resolve_download_url(settings, entry)
  if not url:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='voice missing download url')
  if target.suffix:
    tmp_path = target.with_suffix(target.suffix + '.download')
  else:
    tmp_path = target.with_name(target.name + '.download')
  try:
    with httpx.Client(timeout=settings.voice_download_timeout) as client:
      response = client.get(url)
    if response.status_code >= 400:
      raise HTTPException(status_code=response.status_code, detail='voice download failed')
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp_path.write_bytes(response.content)
    tmp_path.replace(target)
  except HTTPException:
    tmp_path.unlink(missing_ok=True)
    raise
  except httpx.HTTPError as exc:  # pragma: no cover - network failure path
    tmp_path.unlink(missing_ok=True)
    LOGGER.warning('Voice download request failed: %%s', exc)
    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail='voice download request failed') from exc
  except OSError as exc:  # pragma: no cover - filesystem error path
    tmp_path.unlink(missing_ok=True)
    LOGGER.warning('Voice file write failed: %%s', exc)
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='unable to write voice file') from exc
  return {'status': 'ready', 'voice_id': voice_id, 'size_mb': entry.get('size_mb'), 'installed': True}
