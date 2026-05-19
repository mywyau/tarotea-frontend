# Echo Lab Rearchitecture Tracker

> Purpose: provide a single source of truth for a multi-PR migration from synchronous pronunciation checks to an async queue + worker model.

## 1) Problem Statement

### Current state
- Echo Lab pronunciation checks run synchronously in a user-facing API request.
- The request path currently includes validation, access checks, usage accounting, transcription, scoring, and final response.

### Risks at higher concurrency
- Request latency tied directly to transcription latency.
- Burst traffic can cause timeout/retry cascades.
- Harder to apply global backpressure and concurrency limits.

### Goal
Migrate to:
1. `request → validate → reserve → enqueue → fast response`
2. `worker → transcribe → score → persist`
3. `client → poll/subscribe → result`

---

## 2) Target Architecture

### High-level flow
1. Client submits audio and target metadata.
2. API validates/authenticates, reserves usage, stores attempt, enqueues job, returns `202` + `attemptId`.
3. Worker processes queued jobs with bounded concurrency.
4. Client polls (or subscribes later) for attempt status/result.

### Primary components
- Submit endpoint: `POST /api/echo-lab/attempts`
- Status endpoint: `GET /api/echo-lab/attempts/:id`
- Worker endpoint: `POST /api/worker/echo-lab-attempt`
- Data model: `echo_lab_attempts` (+ optional usage ledger)
- Queue transport: QStash
- Concurrency/backpressure: Redis controls

---

## 3) Scope, Non-Goals, and Guardrails

### In scope
- Async pronunciation pipeline.
- Polling-based UI state model (`queued`, `processing`, `complete`, `failed`).
- Minimal migration risk via feature flags.

### Out of scope (initial rollout)
- WebSocket implementation.
- Major UX redesign unrelated to async state changes.
- Broad refactors outside Echo Lab path.

### Guardrails
- Keep old sync endpoint behind fallback until async path is proven.
- Each PR must be independently deployable and reversible.

---

## 4) Feature Flags

| Flag | Purpose | Default | Rollback Use |
|---|---|---|---|
| `ECHO_ASYNC_SUBMIT_ENABLED` | Enables new async submit endpoint usage. | `false` | Turn off new submit path quickly. |
| `ECHO_WORKER_ENABLED` | Allows worker to process queued attempts. | `false` | Pause async processing safely. |
| `ECHO_POLLING_UI_ENABLED` | Enables polling-based client states. | `false` | Revert UI to legacy route usage. |
| `ECHO_SYNC_FALLBACK_ENABLED` | Keeps legacy sync path callable during migration. | `true` | Emergency fallback path. |

---

## 5) API Contracts (Draft)

## `POST /api/echo-lab/attempts`
Creates a pronunciation attempt and enqueues background processing.

### Request
- Multipart form data:
  - `audio` (required)
  - `wordId` (required)
  - `exampleIndex` (required)
  - `scope` (optional)
  - `slug` (optional)
  - `idempotencyKey` (recommended)

### Response (202)
```json
{
  "attemptId": "uuid",
  "status": "queued",
  "pollAfterMs": 1000,
  "remainingAttempts": 42,
  "limit": 3000
}
```

## `GET /api/echo-lab/attempts/:id`
Returns attempt state and, when complete, result payload.

### Response (queued/processing)
```json
{
  "attemptId": "uuid",
  "status": "queued",
  "pollAfterMs": 1000
}
```

### Response (complete)
```json
{
  "attemptId": "uuid",
  "status": "complete",
  "transcript": "...",
  "heardText": "...",
  "expectedChinese": "...",
  "expectedJyutping": "...",
  "score": 87,
  "matchType": "...",
  "confidence": 0.91,
  "feedback": ["..."]
}
```

### Response (failed)
```json
{
  "attemptId": "uuid",
  "status": "failed",
  "message": "Failed to process pronunciation"
}
```

## `POST /api/worker/echo-lab-attempt`
Queue-consumed worker entrypoint for transcription + scoring.

---

## 6) Data Model (Draft)

## `echo_lab_attempts`
Suggested fields:
- `id` (uuid, pk)
- `user_id` (text)
- `status` (enum/text: queued/processing/complete/failed/expired)
- `word_id` (text)
- `example_index` (int)
- `scope` (text nullable)
- `slug` (text nullable)
- `audio_object_key` (text)
- `transcript` (text nullable)
- `expected_chinese` (text nullable)
- `expected_jyutping` (text nullable)
- `score` (int nullable)
- `match_type` (text nullable)
- `confidence` (numeric nullable)
- `feedback_json` (jsonb nullable)
- `error_code` (text nullable)
- `error_message` (text nullable)
- `idempotency_key` (text nullable)
- timestamps (`created_at`, `queued_at`, `processing_at`, `completed_at`, `failed_at`)

Optional uniqueness:
- unique on `(user_id, idempotency_key)` when key is present.

---

## 7) PR Sequence Checklist

Use this as the default progression. Update statuses at each merge.

| PR | Scope | Dependencies | Flag(s) | Status |
|---|---|---|---|---|
| PR-1 | Add `echo_lab_attempts` migration + repository helpers. | none | none | `planned` |
| PR-2 | Add async submit endpoint (`POST /api/echo-lab/attempts`) + enqueue plumbing. | PR-1 | `ECHO_ASYNC_SUBMIT_ENABLED` | `planned` |
| PR-3 | Add worker endpoint (`POST /api/worker/echo-lab-attempt`) + move transcription/scoring logic. | PR-1/2 | `ECHO_WORKER_ENABLED` | `planned` |
| PR-4 | Add status endpoint (`GET /api/echo-lab/attempts/:id`) + client polling UI states. | PR-1/2/3 | `ECHO_POLLING_UI_ENABLED` | `planned` |
| PR-5 | Add observability (queue failures, worker failures, stuck processing, latency histograms). | PR-2/3/4 | none | `planned` |
| PR-6 | Add capacity controls (global semaphore, tier lane limits, overload behavior). | PR-5 | none | `planned` |
| PR-7 | Rollout + remove legacy sync path after SLO confidence window. | PR-1..6 | `ECHO_SYNC_FALLBACK_ENABLED` | `planned` |

---

## 8) Standard PR Description Template

Copy/paste this into each PR.

```md
## Summary
- [ ] What changed (technical)
- [ ] Why this slice is needed now

## Tracker Link
- `docs/echo-lab-rearchitecture.md` section(s):
  - 

## Scope Boundaries
### In scope
- 

### Out of scope
- 

## Flags
- Introduced/changed flags:
  - 
- Default values:
  - 

## API/Data Contract Changes
- Endpoints:
  - 
- Request/response changes:
  - 
- Migration(s):
  - 

## Risks
- 

## Rollback Plan
- 

## Testing
- [ ] Unit
- [ ] Integration
- [ ] Manual verification
- Commands run:
  - 

## Handoff to Next PR
- Next PR expected:
- Open decisions:
- TODO carry-over:
```

---

## 9) Handoff Note Template

Add this to the bottom of tracker after each merge.

```md
## Handoff Note — <PR-ID> — <DATE>

### Completed
- 

### Decisions Made
- 

### Migrations Applied
- 

### Flags State
- `FLAG_NAME=value`

### Observability Added/Changed
- 

### Known Risks / Debt
- 

### Next PR Scope (authoritative)
- 

### Blockers
- 
```

---

## 10) SLO Targets and Readiness Gates

### Initial SLO targets
- Submit endpoint p95 < 300ms.
- Status endpoint p95 < 150ms.
- Queue wait p95: Pro < 8s, Free < 25s.
- End-to-end completion p95: Pro < 15s, Free < 35s.
- Attempt failure rate < 1% (excluding invalid-audio user errors).

### Rollout gates
- Gate A: dark launch internally only.
- Gate B: 5% traffic + monitor 24h.
- Gate C: 25% traffic + monitor 72h.
- Gate D: 100% traffic + keep sync fallback for confidence window.

---

## 11) Decision Log

Use this to preserve architecture intent over time.

| Date | Decision | Why | Owner |
|---|---|---|---|
| YYYY-MM-DD |  |  |  |

---

## 12) Open Questions

- Do we implement usage reserve/commit/refund in phase 1 or phase 2?
- Do we persist attempt status in Redis for hot reads in addition to DB?
- Do we add SSE after polling baseline stabilizes?

