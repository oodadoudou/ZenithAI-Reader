# BACKEND_PLAN.md — PaperRead Backend (Plan of Record)

**Scope:** Provide a lightweight backend focused on **offline TTS** via a local container (Piper wrapper) and an optional **online TTS proxy**. The reader app is static; books + progress are stored locally on-device.

## Milestones

### M1 — Scaffolding
- FastAPI app skeleton with `/healthz` and `/readyz`.
- Dockerfile for the service; `docker-compose.yml` stub (app static server + tts).
- Test scaffold with pytest.

### M2 — Offline TTS (default)
- `POST /tts` accepts `{ text, voice_id, rate?, pitch? }`.
- Invoke Piper (or stub if binary absent); write audio to `MEDIA_DIR`.
- Filesystem cache by SHA1(text|voice|rate|pitch).
- Returns: audio stream by default; `?json=1` → `{ audio_url, duration_ms? }`.
- Cache key: SHA1 of `${voice_id}|${rate}|${pitch}|${text}` (hex, first 12 chars).
- Output file pattern: `${MEDIA_DIR}/${key}-${voice_id}.wav`
- `?json=1` returns: `{ "audio_url": "/media/<filename>", "duration_ms": <nullable> }`
- Enforce MAX_CHARS env (default 5000); 413 on overflow.
- If PIPER_BIN not found, synthesize via a STUB (valid WAV header); still cache by key.
- Ready check `/readyz` reports piper presence boolean.
- Provide a cache eviction endpoint (e.g. `DELETE /tts/cache/{filename}`) so the reader can drop audio files when a book is deleted (per REQUIREMENTS.md).
- Accept optional `book_id` in `POST /tts` requests and track generated filenames in `media_dir/audio_index.json` so deleting a book can clear related audio automatically.

### M3 — Online TTS proxy (optional)
- `POST /tts/generate` forwards to `ONLINE_TTS_BASE_URL` with API key if `ENABLE_ONLINE_PROXY=1`.
- Normalize response to `{ audio_url, duration_ms? }`.

### M4 — Hardening & Observability
- Request timing + structured JSON logs.
- Limits: max chars per call; simple in-memory rate limit.
- Readiness checks validate Piper path when offline TTS enabled.

### M5 — Tests
- Unit: validation, routing, cache key, limits.
- Integration: `/tts` with stubbed Piper; `/tts/generate` with mocked upstream.

### M6 — Book Upload & Storage API (top piority )
- `POST /library/upload` accepts `.epub`/`.txt`, validates MIME/size, and stores files under `BOOKS_DIR` (default `/data/books`) using hashed filenames plus original metadata.
- `GET /library` **lists** stored books with `{ id, title, author?, added_at, file_size, cover? }`; `GET /library/{book_id}` streams the raw asset when the browser lacks OPFS.
- `DELETE /library/{book_id}` removes the book payload **and** invokes cache eviction for related audio files.
- Persist lightweight metadata DB (`library.json`) so the static app can request sync snapshots when OPFS is unavailable.
- Enforce upload size limits + content-type allowlist to stay aligned with the privacy/storage rules in `REQUIREMENTS.md`.

## Gap log

- 2025-11-15 — **Reader metadata + settings parity**: the FastAPI helper lacked a way to capture `cover` art or `last_read_location`, and the browser stored progress only as a loose string with no column/font controls. This change adds structured metadata endpoints on the backend plus the corresponding reader UI/state syncing so OPFS (with IDB fallback) keeps font size, column mode, voice, provider, and `{ para, chars }` progress aligned with the requirements.

## Final API (target shape)
- `POST /tts` → audio stream or `{ audio_url, duration_ms? }`
- `POST /tts/generate` (if enabled) → `{ audio_url, duration_ms? }`
- `GET /healthz`, `GET /readyz` → `{ status: "ok" | "degraded" }`

## Environment
- `PORT` (default 8750), `MEDIA_DIR` (/data/media), `PIPER_BIN` (/usr/local/bin/piper), `VOICE_DIR` (/models)
- `ENABLE_ONLINE_PROXY` (0/1), `ONLINE_TTS_BASE_URL`, `ONLINE_TTS_API_KEY`

## Change control
If implementation details change, **update this plan first**, then code, then tests. Each milestone should end with tests and a brief change log.
