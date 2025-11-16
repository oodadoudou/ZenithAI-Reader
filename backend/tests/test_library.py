
def _upload_sample(client, content: bytes, filename: str = "story.txt"):
  response = client.post(
      "/library/upload",
      data={"title": "Story", "author": "Anon", "cover": "data:image/png;base64,stub"},
      files={"file": (filename, content, "text/plain")},
  )
  assert response.status_code == 200
  return response.json()


def test_upload_list_and_get_book(client_builder):
  client, _, books_dir, _ = client_builder()
  entry = _upload_sample(client, b"Hello world")
  assert (books_dir / entry["filename"]).exists()

  listing = client.get("/library")
  assert listing.status_code == 200
  assert listing.json()[0]["title"] == "Story"
  assert listing.json()[0]["cover"] == "data:image/png;base64,stub"

  book_resp = client.get(f"/library/{entry['id']}")
  assert book_resp.status_code == 200
  assert book_resp.content == b"Hello world"


def test_patch_updates_metadata(client_builder):
  client, _, _, _ = client_builder()
  entry = _upload_sample(client, b"Patch me")
  payload = {"title": "Updated Story", "last_read_location": {"para": 3, "chars": 120}}
  response = client.patch(f"/library/{entry['id']}", json=payload)
  assert response.status_code == 200
  body = response.json()
  assert body["title"] == "Updated Story"
  assert body["last_read_location"] == {"para": 3, "chars": 120}


def test_patch_validates_payload(client_builder):
  client, _, _, _ = client_builder()
  entry = _upload_sample(client, b"Bad patch")
  bad_resp = client.patch(f"/library/{entry['id']}", json={"last_read_location": {"para": -1, "chars": 0}})
  assert bad_resp.status_code == 400
  unknown_resp = client.patch(f"/library/{entry['id']}", json={"foo": "bar"})
  assert unknown_resp.status_code == 400


def test_delete_book_removes_audio_cache(client_builder):
  client, media_dir, _, _ = client_builder()
  entry = _upload_sample(client, b"Goodbye")
  payload = {"text": "audio", "voice_id": "voice", "book_id": entry["id"]}
  audio_resp = client.post("/tts", params={"json": 1}, json=payload)
  filename = audio_resp.json()["audio_url"].split("/media/")[-1]
  assert (media_dir / filename).exists()

  delete_resp = client.delete(f"/library/{entry['id']}")
  assert delete_resp.status_code == 200
  assert not (media_dir / filename).exists()


def test_upload_respects_size_limit(client_builder):
  client, _, _, _ = client_builder(MAX_UPLOAD_BYTES="10")
  response = client.post(
      "/library/upload",
      data={"title": "Big"},
      files={"file": ("big.epub", b"x" * 20, "application/epub+zip")},
  )
  assert response.status_code == 413
