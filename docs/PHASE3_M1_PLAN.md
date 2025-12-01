# Phase 3 — Milestone 1 Plan

## Goals
- Deliver shelves/tags, metadata editor, batch actions, and persistent grid/list view.
- Quality gates: group coverage thresholds (utils/services/parser ≥80%, storage ≥60%), global ≥60%; key pages E2E must pass; pa11y audits clean.

## Acceptance Criteria
- Shelves/tags: create/edit/delete tags; assign/remove tags in batch; filter by tags; persist locally.
- Metadata editor: edit title/author/series/description; cover replace; changes persist and reflect in library UI.
- Batch actions: multi-select delete/export with confirmation dialog listing counts.
- Grid/list view: selection persists across sessions; accessible controls with `aria-pressed`.

## Tasks & Owners
- Shelves/tags data model & storage (Owner: Storage)
- Tag assignment UI & filters (Owner: Frontend)
- Metadata editor modal & validation（Owner: Frontend）
- Batch actions with confirm dialog（Owner: Frontend）
- Tests（unit/E2E）与文档（Owner: QA/Docs）

## Timeline
- Week 1–2: Shelves/tags, metadata editor, batch actions; grid/list persistence
- Week 3: Tag filters UX polish、error states、tests与文档

## Reporting
- Weekly status in `PLAN.md` and `docs/PHASE3_M1_STATUS.md`；CI artifacts uploaded（coverage、a11y、E2E）。