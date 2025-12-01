# Phase 2 UI Regression Log

## Environment
- macOS Sonoma 14.4 (Apple M2)
- Browsers: Chrome 121 (desktop), Safari 17 Responsive Design Mode (iPhone 15 Pro preset), Firefox 123
- App build: `npm run build` → `npm run preview`
- Book fixture: `docs/fixtures/phase2-sample.epub` (2-chapter demo with bookmarks and annotations)

## Scenarios

### Selection toolbar + highlight colors
1. Open `/reading.html?bookId=phase2-demo`.
2. Select a sentence spanning ~80 characters.
3. Verify the floating toolbar appears with four swatches plus Note/Define/Quote/Share buttons.
4. Capture screenshot `public/static/screens/regressions/selection-toolbar.svg`.
- **Result:** PASS — toolbar respects reduced-motion preference and focus traps when tabbing.

### Quote card share sheet
1. With a selection active, choose **Quote**.
2. Inspect the quote card preview and buttons.
3. Capture screenshot `public/static/screens/regressions/quote-card.svg`.
- **Result:** PASS — buttons announce via `aria-live`, share prompt gated by privacy banner copy.

### Annotations drawer with search
1. Click the stylus icon → open annotations panel.
2. Filter with “night” keyword.
3. Capture screenshot `public/static/screens/regressions/annotations-panel.svg`.
- **Result:** PASS — search narrows chips, entries jump to paragraphs when activated, night theme legible.

## Notes
- Each capture stored in `public/static/screens/regressions/` to keep snapshots versioned with code.
- Future regressions should reuse `docs/fixtures/phase2-sample.epub` to maintain consistent pagination and CFIs.
