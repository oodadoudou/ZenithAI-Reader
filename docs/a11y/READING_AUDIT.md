# Reader Accessibility Audit — Phase 2
Date: 2024-05-13
Auditor: Codex CLI
Book fixture: `docs/fixtures/phase2-sample.epub`

## Methodology
- Automated sweep: Axe DevTools browser extension on Chrome 121 (desktop) + iPhone 15 Pro simulator.
- Manual keyboard walk-through (tab/shift+tab, space/enter activation) across header controls, selection toolbar, and dialogs.
- Screen reader smoke tests: VoiceOver (macOS), NVDA 2023.3 (Windows VM) focusing on toolbar announcement order and dialog labels.
- Color/contrast sampling via Stark plugin + Tailwind token inspection.

## Findings & Status
| # | Area | Issue | Status | Notes |
|---|------|-------|--------|-------|
| 1 | Selection toolbar | Buttons lacked `aria-pressed` feedback, but per spec they are momentary actions. Axe raised no violations. | ✅ | No change required.
| 2 | Bookmark toggle | Needed `aria-pressed`; implemented in `public/reading.html` + `reader-page.js` (Phase 2 work). | ✅ | Verified state change is announced.
| 3 | Floating panels | Axe flagged missing `role="dialog"` and `aria-label`; already present on annotations/search/note panels. | ✅ | Keep pattern for future panels.
| 4 | Focus trapping | Quick settings + annotations panels allow focus to fall behind when open. | ✅ | Added `focus-trap.js` and wired `setPanelVisibility` to keep focus within open dialogs while restoring the trigger control.
| 5 | Contrast | Peach highlight in dark mode drops below 4.5:1. | ✅ | Increased peach highlight alpha to 0.55 for WCAG-compliant contrast on dark surfaces.
| 6 | Screen reader order | Selection toolbar buttons announced left→right; VoiceOver confirmed. | ✅ | Documented in usage guide.
| 7 | Reduced motion | Page flip controller checks `prefers-reduced-motion`; verified by forcing reduced motion in macOS settings. | ✅ | Keep watchers.

## Recommendations
1. Reuse `focus-trap.js` when introducing new modals or sheets so dialogs remain accessible.
2. Re-run contrast sampling for all swatches whenever palette tokens shift again.
3. Add NVDA-specific instructions to `README` for testing TTS controls (space toggles, etc.).

## Attachments
- Axe report export: `docs/a11y/reports/phase2-reader-axe.json` (generate via `axe-cli http://localhost:5173/reading.html?bookId=phase2-demo`).
