# Repository Guidelines

PaperRead pairs a static browser reader with an optional FastAPI helper; follow these notes to stay aligned with the repo’s layout, tooling, and privacy rules.

## Project Structure & Module Organization
Serve-ready HTML entry points live in `public/index.html` and `public/reading.html`, with the service worker and manifest beside them. Browser logic belongs in ESM modules under `public/js/`, while Tailwind-driven styles reside in `public/css/`. Backend logic, FastAPI schemas, and planning docs are under `backend/`, and automated checks live in `tests/`. Use `stitch_e_book_reader_import_page/` as the canonical source for layout tokens, ARIA references, and shared text snippets.

## Build, Test, and Development Commands
- `npm install` — install frontend dependencies.
- `npm run dev` — serve `public/` and keep the offline `/tts` worker hot.
- `npm run build` — generate the production bundle plus service-worker manifest.
- `npm run test` — run Vitest suites under `public/js/__tests__/`.
- `uvicorn backend.main:app --reload --port 8750` — start the offline TTS API; pair with `pytest backend/tests -q` for endpoint coverage.

## Coding Style & Naming Conventions
Write vanilla ESM with two-space indentation, descriptive named exports, and modules kept under ~200 lines. Prefer pure helpers over stateful singletons. Default to Tailwind utilities; only add scoped CSS when `stitch_e_book_reader_import_page` lacks a token. Preserve accessible focus states, correct roles, and `aria-pressed` on toggles. Persist reader metadata via OPFS first, then fall back to IndexedDB.

## Testing Guidelines
Vitest specs mirror module names (`public/js/__tests__/reader.spec.js`). Mock OPFS boundaries only when manipulating browser storage APIs; keep real `.epub` unzip and `.txt` paragraph chunking paths. Backend tests must hit `/tts` and `/tts/generate`, validating `{ text, voice_id, rate?, pitch? } → { audio_url, duration_ms? }`. Gate merges on `npm run test && pytest`.

## Commit & Pull Request Guidelines
Use imperative commit subjects, keep each change scoped, and reference issues or requirement IDs in bodies. Pull requests must include a concise summary, evidence for UI changes, logs from the required test commands, and explicit notes for privacy or API adjustments. Update `backend/BACKEND_PLAN.md` before touching server code, and document storage or contract migrations directly in the PR.

## Storage, Privacy & TTS Notes
All parsing happens client-side (sanitized XHTML for `.epub`, paragraph chunking for `.txt`). Cache only the reader shell plus generated audio, and delete audio when the source book leaves the library. Default to `http://localhost:8750/tts`; if `${ONLINE_TTS_BASE_URL}/tts/generate` is chosen, surface a privacy notice so readers opt in knowingly.
