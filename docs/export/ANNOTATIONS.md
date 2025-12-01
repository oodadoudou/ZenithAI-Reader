# Annotation & Vocabulary Export/Import Guide

## Export bundles
PaperRead packages annotations, bookmarks, and vocabulary into a `.paperread` archive alongside OPFS book data. The service worker collects the following JSON manifests:

- `annotations.json` — per-book array of highlight objects (`id`, `bookId`, `paraIndex`, `cfi`, `color`, `text`, `note`, `createdAt`, `status`).
- `bookmarks.json` — per-book array of bookmark objects (`id`, `bookId`, `paraIndex`, `cfi`, `chars`, `snippet`, `createdAt`).
- `vocabulary.json` — global vocabulary cards (`id`, `word`, `definition`, `sentence`, `status`, `createdAt`).

Each manifest lives under `meta/` inside the archive. The export modal reminds readers that data stays on-device unless they explicitly save/export the bundle.

## Privacy & consent notices
- Highlight sharing (quote cards, share sheet) never uploads content automatically; selecting **Share…** invokes the system share dialog only.
- When a translation provider is configured, the reader displays the translation consent modal (`translation-consent-panel`) before sending the selected word off-device. The consent state is stored locally (`paperread-translation-consent`) and can be revoked from Settings.
- Online TTS providers surface the existing privacy banner (`privacy-banner`) warning that selected passages will be transmitted for synthesis.

## Import behavior
1. The import dialog validates the archive signature (planned Phase 3) and displays a summary of what will change (books, annotations, vocabulary).
2. Annotations/bookmarks are merged per `bookId`; conflicts are resolved by keeping the latest `createdAt` entry per `id` and updating CFIs if the target book has been reflowed.
3. Vocabulary entries merge on lowercase word; duplicates update the definition and keep the highest mastery status.
4. Privacy settings (translation consent, TTS provider choice) remain untouched—imports cannot toggle cloud providers without explicit user action.

## Developer checklist
- When adding new annotation fields, update `docs/export/ANNOTATIONS.md` plus the export/import pipeline so bundles stay backwards compatible.
- Any remote feature that transmits text must add a consent banner/modal modeled after the translation flow before hitting external APIs.
- Before release, verify `npm run build` → `npm run preview` → export/import cycle with `docs/fixtures/phase2-sample.epub` to ensure CFIs remain valid.
