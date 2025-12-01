
def test_status_reports_usage(client_builder, tmp_path):
  voices_dir = tmp_path / 'voice_models'
  voices_dir.mkdir()
  client, media_dir, _, _ = client_builder(VOICE_DIR=str(voices_dir))
  (media_dir / 'sample.wav').write_bytes(b'x' * 1024 * 1024)
  (voices_dir / 'voice.onnx').write_bytes(b'y' * 2 * 1024 * 1024)

  resp = client.get('/status')
  assert resp.status_code == 200
  payload = resp.json()
  assert payload['disk_free_mb'] > 0
  assert payload['cache_usage_mb'] >= 1
  assert payload['model_usage_mb'] >= 2
