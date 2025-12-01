# PaperRead Sync Specification (Draft)

## Overview
Optional encrypted sync connectors allow users to synchronize books, metadata, annotations, progress, settings and voice presets. Sync is opt‑in and privacy‑preserving.

## Data Scope
- Books (metadata only or full file if user opts in)
- Annotations, bookmarks, vocabulary
- Reading stats and progress
- Settings and voice presets

## Transport & Security
- HTTPS endpoints, client authentication via API key or token
- Payloads encrypted at rest (server‑side) and in transit (TLS)
- Optional end‑to‑end encryption: payloads encrypted using user key prior to upload

## Client Behavior
- Offline queue and retry with exponential backoff
- Conflict resolution: last‑writer‑wins by timestamp plus field‑level merge for lists (annotations/bookmarks)
- Partial sync support: per book or per collection

## Endpoints (example)
- POST /sync/upload { entity, payload, ts }
- GET /sync/pull?since=timestamp → { entities[] }

## Errors & Retries
- 5xx → retry with backoff
- 4xx → persist error and surface in UI; require user action

## Privacy & Opt‑In
- Sync disabled by default; explicit opt‑in required
- Clear banners and settings toggles; allow full local purge

## Observability
- Local telemetry counters; diagnostics panel displays last sync status and queue size

## Testing
- Contract tests use a mock connector with deterministic delays and error injection; verify retries/backoff/encryption stubs and queue draining.