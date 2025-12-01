"""System usage helpers for disk + cache reporting."""

from __future__ import annotations

import shutil
from pathlib import Path

from .settings import Settings

_MB = 1024 * 1024


def _sum_directory(path: Path) -> int:
  if not path or not path.exists():
    return 0
  total = 0
  for file_path in path.rglob('*'):
    if file_path.is_file():
      total += file_path.stat().st_size
  return total


def get_system_status(settings: Settings) -> dict:
  usage = shutil.disk_usage(settings.media_dir)
  cache_usage = sum(file_path.stat().st_size for file_path in settings.media_dir.glob('*.wav'))
  model_usage = _sum_directory(settings.voice_dir)
  return {
      'disk_free_mb': round(usage.free / _MB, 2),
      'cache_usage_mb': round(cache_usage / _MB, 2),
      'model_usage_mb': round(model_usage / _MB, 2),
  }
