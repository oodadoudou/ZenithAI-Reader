# ZenithAI Reader (PaperRead)

Static, privacy-first ebook reader with an optional FastAPI helper for offline text-to-speech (TTS). Books stay on-device, while configurable offline/online TTS providers let you listen without leaking content.

## Quick Start

### Option 1: Local Development (Recommended)

**Terminal 1 – Start Backend TTS Service:**
```bash
cd /path/to/ZenithAI-Reader
uvicorn backend.tts_service.main:app --reload --port 8750
```

**Terminal 2 – Start Frontend Dev Server:**
```bash
cd /path/to/ZenithAI-Reader
npm install          # first time only
npm run dev
```

Then open **http://localhost:5173** in your browser. The frontend will communicate with the backend at `http://localhost:8750/tts`.

### Option 2: Docker Deployment

**Build and run both services with Docker:**
```bash
npm install && npm run build    # build frontend assets first
cd backend
docker compose up --build
```

- **Frontend:** http://localhost:8080
- **Backend API:** http://localhost:8750

**Stop services:**
```bash
docker compose down
```

## Development

### Frontend
- **Install dependencies:** `npm install`
- **Dev server:** `npm run dev` (serves `public/` at http://localhost:5173)
- **Run tests:** `npm run test`
- **Production build:** `npm run build`
- **PDF support:** the PDF parser relies on pdf.js standard fonts. Copy `node_modules/pdfjs-dist/standard_fonts/` into `public/static/pdfjs/` (or adjust `standardFontDataUrl` in `public/js/parser/pdf.js`) before deploying.
- **Dictionary & translation:** add offline dictionary packs to `public/data/` (update `DICTIONARY_PACK_URL`) and configure `TRANSLATION_PROVIDER`/`TRANSLATION_URL` in `public/config.json`. The reader shows a consent modal before sending lookup text to the remote translator.
- **Annotation export/import:** follow `docs/export/ANNOTATIONS.md` for the manifest formats and privacy notices (translation consent, share sheets) when working on bundles.

### Accessibility & Screen Reader QA
- **VoiceOver (macOS):** turn on `Cmd+F5`, then use `Control+Option+Space` to activate toolbar buttons and verify selection toolbar announcements.
- **NVDA (Windows):** follow `docs/a11y/NVDA.md` for setup plus test flows (bookmark toggle, dialogs, TTS controls). Capture findings in `docs/a11y/READING_AUDIT.md` whenever regressions are filed.

### Backend (offline TTS helper)
- **Setup virtualenv:** `python -m venv venv && source venv/bin/activate`
- **Install deps:** `pip install -r backend/requirements.txt`
- **Start server:** `uvicorn backend.tts_service.main:app --reload --port 8750`
- **Run tests:** `pytest backend/tests -q`

The backend exposes `/tts` for offline synthesis, `/tts/generate` as a pass-through when `ONLINE_TTS_BASE_URL` is configured, `/voices` + `/voices/download` for managing Piper models, and `/status` for disk/cache telemetry.

## UI Preview

**Library page** – Search/sort, tags, metadata editing; EPUB covers auto‑extracted:

![Library page showing collection management](public/static/screens/library.jpg)

**Reading experience** – Chapter nav, TTS playback, sleep timer, diagnostics overlay:

![Reader displaying text and controls](public/static/screens/reader.jpg)
