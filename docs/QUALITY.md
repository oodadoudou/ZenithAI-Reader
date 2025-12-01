# Quality Assurance — Accessibility & Coverage Gates

## Accessibility Audits

- Tool: `pa11y` (headless).
- Pages audited: `index.html`, `reading.html` via `vite preview` on `http://127.0.0.1:4173/`.
- Reports: JSON saved under `reports/a11y-index.json`, `reports/a11y-reading.json`.
- Scope: WCAG 2.1 AA checks (labels, roles, contrast, focus order, keyboard access).
- Run locally:
  - `npm run build`
  - `nohup npm run preview -- --host 127.0.0.1 & sleep 3`
  - `npm run a11y:report:index && npm run a11y:report:reading`

## Coverage Gates

- Command: `npm run test:coverage` (Vitest v8 coverage provider).
- Gate script: `scripts/coverage/check.js` enforces thresholds:
  - Lines: 80%
  - Functions: 80%
  - Statements: 80%
  - Branches: 60%
- Reports:
  - HTML: `coverage/index.html`
  - JSON summary: `coverage/coverage-summary.json`

## CI Integration

- Workflow: `.github/workflows/ci.yml`.
- Steps:
  - Install deps → build → unit tests → coverage run → threshold gate.
  - Preview server → pa11y audits → upload `coverage/` + `reports/` artifacts.
  - Backend `pytest` unaffected.

## Remediation Tracking

- Audit findings should be triaged into issues.
- Each issue tracks: rule ID, location, severity, fix PR, verification run.

## Notes & Performance

- Pa11y runs headless with minimal overhead; use sparingly in PRs to reduce runtime.
- Coverage gate ensures baseline quality; raise thresholds as the suite grows.