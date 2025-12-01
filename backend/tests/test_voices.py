import json

import httpx


def _manifest(entries):
  return json.dumps(entries)


def _voice_entry(voice_id, filename='voice.onnx', download_url='https://voice.test/voice.onnx'):
  return {
      'id': voice_id,
      'name': 'Voice',
      'language': 'en',
      'gender': 'female',
      'size_mb': 10,
      'download_url': download_url,
      'filename': filename,
  }


def test_voice_listing_marks_installation(client_builder, tmp_path):
  manifest_path = tmp_path / 'manifest.json'
  manifest_path.write_text(_manifest([_voice_entry('mandarin', filename='mandarin.onnx')]))
  voices_dir = tmp_path / 'voices'
  voices_dir.mkdir()
  client, _, _, _ = client_builder(VOICE_MANIFEST_PATH=str(manifest_path), VOICE_DIR=str(voices_dir))

  resp = client.get('/voices')
  assert resp.status_code == 200
  body = resp.json()
  assert body['voices'][0]['installed'] is False

  (voices_dir / 'mandarin.onnx').write_bytes(b'voice')
  resp_second = client.get('/voices')
  assert resp_second.json()['voices'][0]['installed'] is True


def test_voice_download_fetches_file(client_builder, tmp_path, monkeypatch):
  manifest_path = tmp_path / 'manifest.json'
  manifest_path.write_text(_manifest([_voice_entry('en_US', filename='en_US.onnx', download_url='https://voice.example/en_US.onnx')]))
  voices_dir = tmp_path / 'voices'
  voices_dir.mkdir()

  class DummyClient:
    def __enter__(self):
      return self

    def __exit__(self, exc_type, exc, tb):
      return False

    def get(self, url):
      self.url = url
      return httpx.Response(200, content=b'onnx-bytes')

  monkeypatch.setattr('tts_service.voices.httpx.Client', lambda timeout: DummyClient())
  client, _, _, _ = client_builder(VOICE_MANIFEST_PATH=str(manifest_path), VOICE_DIR=str(voices_dir))

  resp = client.post('/voices/download', json={'voice_id': 'en_US'})
  assert resp.status_code == 200
  payload = resp.json()
  assert payload['status'] == 'ready'
  assert (voices_dir / 'en_US.onnx').read_bytes() == b'onnx-bytes'
