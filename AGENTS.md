# Repository Guidelines

## Project Structure & Module Organization
The frontend lives in `public/`; `public/js/ui`, `parser`, `services`, `storage`, and `utils` hold UI controllers, EPUB/TXT parsing, sync + TTS gateways, IndexedDB abstractions, and shared helpers. Assets and styles reside in `public/static` and `public/css`, while Vite outputs builds to `dist/`. The FastAPI helper with Docker assets stays under `backend/`, with tests in `backend/tests`. Consult `ARCHITECTURE.md` and `REQUIREMENTS.md` before moving cross-cutting code.

## Build, Test, and Development Commands
`npm install` prepares the frontend. Use `npm run dev` (listens on :5173) during development, `npm run build` for prod bundles, and `npm run preview` for spot checks. Backend setup: `python -m venv venv && source venv/bin/activate`, `pip install -r backend/requirements.txt`, then `uvicorn backend.tts_service.main:app --reload --port 8750`. Tests: `npm run test`/`npm run test:watch` (Vitest) and `pytest backend/tests -q`. Docker users can `cd backend && docker compose up --build`.

## Coding Style & Naming Conventions
JavaScript follows ES modules with two-space indent, single quotes, and `camelCase` helpers; reserve `PascalCase` for classes like `PageFlipController`. Keep DOM glue in `ui/` files, shared logic in `utils/`, and avoid implicit globals by exporting explicit factories. Tailwind tokens (see `tailwind.config.js`) back custom CSS; prefer `reader-*` prefixes for bespoke selectors. Python code should remain typed, documented, and PEP 8 compliant with `snake_case` APIs and explicit imports.

## Testing Guidelines
Place frontend specs in `public/js/__tests__` using `*.test.js` and Vitest’s describe/it syntax; stub DOM APIs with JSDOM when needed and aim for ≥80% coverage via `npm run test -- --coverage`. Backend suites belong in `backend/tests/test_*.py` and should exercise FastAPI routes with `TestClient` plus temp directories for media. Regression fixes need at least one new spec and manual smoke checks in Chrome + Safari responsive modes.

## Commit & Pull Request Guidelines
Commits follow the existing imperative style (“Update README...”), stay under 72 characters, and include bodies describing intent plus “Tests: npm run test, pytest” style trailers when meaningful. PRs must summarize scope, link issues or spec sections, attach UI screenshots for visual tweaks, and state which commands passed; call out config or schema changes explicitly.

## Security & Configuration Tips
API keys stay out of git—leave placeholders in `public/config.json` and load real values via `.env.local` or shell exports for `backend/tts_service/settings.py` (`ONLINE_TTS_API_KEY`, `MEDIA_DIR`, etc.). Media, dictionary packs, and downloaded voices should live in mounted volumes referenced by those env vars. When exposing new routes, document auth, CORS, and rate-limit expectations in `ARCHITECTURE.md` before merging.
