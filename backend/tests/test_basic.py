import json

import httpx

from tts_service.tts import _voice_model_path


def test_healthz_returns_ok(client_builder):
  client, _, _, _ = client_builder()
  response = client.get("/healthz")
  assert response.status_code == 200
  assert response.json() == {"status": "ok"}


def test_readyz_degraded_when_piper_missing(client_builder, tmp_path):
  missing_path = tmp_path / "bin" / "piper"
  client, _, _, _ = client_builder(PIPER_BIN=str(missing_path))
  response = client.get("/readyz")
  assert response.status_code == 200
  assert response.json()["status"] == "degraded"
  assert response.json()["piper_available"] is False


def test_tts_json_response_tracks_audio_index(client_builder):
  client, _, _, main = client_builder()
  payload = {"text": "hello world", "voice_id": "en_US", "book_id": "book-1"}
  response = client.post("/tts", params={"json": 1}, json=payload)
  assert response.status_code == 200
  body = response.json()
  assert body["audio_url"].startswith("/media/")
  index_path = main.get_settings().audio_index_file
  data = json.loads(index_path.read_text())
  assert data["by_book"]["book-1"]


def test_tts_rate_limit(client_builder):
  client, _, _, _ = client_builder(REQUEST_LIMIT="1", REQUEST_WINDOW_SECONDS="60")
  payload = {"text": "hello", "voice_id": "stub"}
  assert client.post("/tts", json=payload).status_code == 200
  second = client.post("/tts", json=payload)
  assert second.status_code == 429


def test_delete_cache_entry_removes_file(client_builder):
  client, media_dir, _, _ = client_builder()
  payload = {"text": "cache me", "voice_id": "cache"}
  response = client.post("/tts", params={"json": 1}, json=payload)
  filename = response.json()["audio_url"].split("/media/")[-1]
  assert (media_dir / filename).exists()

  delete_resp = client.delete(f"/tts/cache/{filename}")
  assert delete_resp.status_code == 200
  assert delete_resp.json() == {"deleted": True}
  assert not (media_dir / filename).exists()


def test_online_tts_disabled_without_flag(client_builder):
  client, _, _, _ = client_builder()
  payload = {"text": "hello", "voice_id": "stub"}
  response = client.post("/tts/generate", json=payload)
  assert response.status_code == 503


def test_online_tts_forwarding_success(client_builder, monkeypatch):
  class DummyClient:
    def __init__(self):
      self.called = False
      self.url = None

    def __enter__(self):
      return self

    def __exit__(self, exc_type, exc, tb):
      return False

    def post(self, url, json, headers):
      self.called = True
      self.url = url
      return httpx.Response(200, json={"audio_url": "https://cdn/audio.wav", "duration_ms": 1234})

  dummy = DummyClient()
  monkeypatch.setattr("tts_service.tts.httpx.Client", lambda *args, **kwargs: dummy)
  client, _, _, _ = client_builder(
      ENABLE_ONLINE_PROXY="1",
      ONLINE_TTS_BASE_URL="https://api.example.com",
      ONLINE_TTS_API_KEY="secret",
  )
  payload = {"text": "hi", "voice_id": "en"}
  response = client.post("/tts/generate", json=payload)
  assert response.status_code == 200
  assert response.json()["audio_url"].startswith("https://cdn")
  assert dummy.called
  assert dummy.url == "https://api.example.com/tts/generate"


def test_voice_alias_maps_to_model_path(client_builder, tmp_path):
  voices_dir = tmp_path / "voices"
  voices_dir.mkdir()
  aliases = json.dumps({"zh_CN_female": "zh-cn-huayan.onnx"})
  _, _, _, main = client_builder(VOICE_DIR=str(voices_dir), VOICE_ALIASES=aliases)

  settings = main.get_settings()
  resolved = _voice_model_path(settings, "zh_CN_female")
  assert str(voices_dir) in resolved
  assert resolved.endswith("zh-cn-huayan.onnx")
