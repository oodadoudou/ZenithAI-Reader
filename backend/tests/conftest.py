import importlib
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
  sys.path.insert(0, str(BACKEND_ROOT))


@pytest.fixture
def client_builder(monkeypatch, tmp_path):
  def _build(**env_overrides):
    media_dir = tmp_path / env_overrides.pop("media_subdir", "media")
    books_dir = tmp_path / env_overrides.pop("books_subdir", "books")
    media_dir.mkdir(parents=True, exist_ok=True)
    books_dir.mkdir(parents=True, exist_ok=True)
    media_dir_resolved = media_dir.resolve()
    books_dir_resolved = books_dir.resolve()
    monkeypatch.setenv("MEDIA_DIR", str(media_dir_resolved))
    monkeypatch.setenv("BOOKS_DIR", str(books_dir_resolved))
    for key, value in env_overrides.items():
      if value is None:
        monkeypatch.delenv(key, raising=False)
      else:
        monkeypatch.setenv(key, value)

    module_names = [
        "tts_service.settings",
        "tts_service.audio_cache",
        "tts_service.rate_limit",
        "tts_service.tts",
        "tts_service.library",
        "tts_service.main",
    ]
    for name in module_names:
      if name in sys.modules:
        importlib.reload(sys.modules[name])
      else:
        importlib.import_module(name)

    import tts_service.main as main
    client = TestClient(main.app)
    return client, media_dir_resolved, books_dir_resolved, main

  return _build
