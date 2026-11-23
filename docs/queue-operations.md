# Queue operations and resilience

Last reviewed: 2026-11-18

## Purpose

This document inventories asynchronous production work, its duplicate-delivery protection, and the controls still needed before sustained high traffic. QStash delivery is at-least-once, so database idempotency is the primary correctness boundary.

## Active queue flows

| Flow | Producer | Worker | Retry / flow control | Idempotency evidence | Current gap |
| --- | --- | --- | --- | --- | --- |
| Vocabulary quiz XP | `/api/quiz/grind/finalize-v5` and daily vocab finalization | `/api/worker/xp-quiz-v5` | 3 retries; 20 parallel and 2,000/min | Stable user/attempt QStash deduplication; `xp_quiz_events` is unique by user/attempt and session | No failure callback or queue-age alert |
| Level sentence quiz XP | `/api/sentences/v3/finalize` | `/api/sentences/v3/xp-quiz-sentences` | 3 retries; 20 parallel | Stable user/session QStash deduplication; event insert uses `(user_id, session_key)` conflict protection; worker checks processed state | No failure callback or queue-age alert |
| Topic sentence quiz XP | `/api/sentences/topics/v3/finalize` | `/api/sentences/topics/v3/xp-quiz-sentences` | 3 retries; 20 parallel | Stable user/session QStash deduplication; event insert uses `(user_id, session_key)` conflict protection; worker checks processed state | No failure callback or queue-age alert |
| Level typing XP | `/api/typing/levels/v2/finalize` | `/api/typing/levels/v2/xp-jyutping` | 3 retries; 20 parallel and 800/min | Stable user/session QStash deduplication; `xp_jyutping_events` is unique by user/session | No failure callback or queue-age alert |
| Topic typing XP | `/api/typing/topic/v2/finalize` | `/api/typing/topic/v2/xp-jyutping` | 3 retries; 20 parallel and 800/min | Stable user/session QStash deduplication; event insert and worker use session-key idempotency | No failure callback or queue-age alert |
| Sentence dojo XP | `/api/typing/sentences/v2/finalize` | `/api/typing/sentences/v2/xp-chinese` | 3 retries; 20 parallel and 800/min | Stable user/session QStash deduplication; event insert and worker use session-key idempotency | No failure callback or queue-age alert |
| Daily Jyutping XP | `/api/daily/jyutping/v2/finalize` | `/api/daily/jyutping/v2/xp-worker` | 3 retries; 20 parallel and 800/min | Stable user/event QStash deduplication; finalization persists an event/session before publishing | No failure callback or queue-age alert |
| Stripe subscription processing | Stripe webhook through `enqueueStripeEventJob` | `/api/stripe/v2/process-event-v2` | 3 retries; per subscription/customer serialization; 120/min | Stripe event ID is both the QStash deduplication ID and database primary key | No failure callback or operational replay command |
| Account deletion | `/api/account/v2/index.delete` | `/api/account/v2/worker-delete` | 3 retries; 2 parallel globally | Job row state plus `account_delete_<jobId>` deduplication ID | No failure callback or alert |

All listed workers verify QStash signatures. The Echo Lab `queue` endpoint currently changes an attempt to `queued` but does not publish to QStash or another worker queue; it must not be counted as asynchronous processing capacity yet.

All active database-heavy QStash flows now have a parallelism boundary. The
account-deletion limit is deliberately small because one job removes data from
multiple stores and external identity systems; a value of two avoids globally
serializing privacy work while protecting the shared database pool. Revisit it
only after the production connection budget and deletion duration are measured.

## Required controls

### Producer contract

Every producer should explicitly define:

- `retries`;
- a stable deduplication ID derived from the persisted event or session;
- a flow-control key, parallelism, and rate for database-heavy work;
- a failure callback or equivalent alerting path;
- a persisted event before publish so a publish failure is recoverable.

### Worker contract

Every worker should:

- verify the QStash signature before parsing trusted identifiers;
- claim or lock the persisted event atomically;
- return success for an already processed event;
- commit all related database updates in one transaction;
- mark the event processed only within that transaction;
- avoid logging raw user, session, customer, or message identifiers;
- expose structured success, retry, and terminal-failure events.

## Monitoring signals

Create alerts for:

- oldest queued message age above 60 seconds;
- delivery failure or retry exhaustion above zero;
- worker 5xx rate above 1% for five minutes;
- processed-event lag above 60 seconds;
- database pool waiting count above zero during worker load;
- a growing count of persisted, unprocessed events older than five minutes.

## Recovery procedure

1. Identify the affected flow and time window from structured logs and QStash message state.
2. Confirm the persisted event/job exists and whether it is already processed.
3. Fix the worker or dependency failure before replaying messages.
4. Replay through the normal producer or a purpose-built authenticated replay command; do not apply XP or billing state manually.
5. Verify the worker treats duplicates as success and the event becomes processed exactly once.
6. Record the incident window, replayed count, and any permanently failed identifiers in redacted form.

## Dead-letter classification and replay gate

QStash retry exhaustion is the transport dead-letter signal. The persisted
database event or job remains the application recovery record; provider message
retention must never be the only copy of work that still needs processing.

Classify each terminal delivery before replay:

| Classification | Evidence | Action |
| --- | --- | --- |
| Already processed | Persisted record is processed and resulting state is present | Acknowledge/close; do not replay |
| Retryable dependency failure | Record is unprocessed; worker/dependency failure is fixed | Replay through the original worker contract |
| Invalid persisted payload | Record cannot satisfy current validation | Quarantine for engineering review; do not edit production data ad hoc |
| Superseded state | Later authoritative event makes the work obsolete | Record the decision and close without replay |
| Missing persistence | Provider message exists without its expected event/job row | Treat as a producer correctness incident; do not reconstruct identifiers from logs |

A replay is permitted only when all of these are true:

1. The exact persisted event/job has been resolved by its internal identifier.
2. Its processed state and expected uniqueness constraint have been checked.
3. The original failure cause is fixed or explicitly accepted for a bounded test.
4. The worker's idempotency behavior for that flow is documented in the table
   above.
5. The replay count, operator, incident reference, and UTC time are recorded.

Replay one item first, verify database state and worker success, then continue in
small batches while watching worker errors, database pool wait, and queue age.
Stop if any item applies its effect more than once or if dependency pressure
rises. Billing and account-deletion replays require an explicit second-person
review because their side effects extend beyond learner XP.

Until a restricted replay tool exists, use the QStash provider replay control
only when it preserves the original signed body and headers expected by the
worker. Never call a signature-protected worker directly with a copied payload,
and never mark a database record processed merely to clear an alert.

## Next implementation batch

1. Add a shared failure-callback policy once its authenticated public URL and persistence contract are defined.
2. Persist and alert on terminal failures.
3. Add a restricted replay endpoint or script that accepts only existing persisted event IDs and records the replay audit fields above.
4. Add queue-depth and oldest-event queries to operational monitoring.

## Recovering vocabulary quiz XP

After applying `npm run db:migrate` and deploying the frontend, create a recurring
QStash schedule for that environment. Set the destination to the deployed
`SITE_URL` followed by `/api/worker/recover-word-quiz-xp`, the method to
`POST`, and the cron expression to `*/5 * * * *` (every five minutes). The
body can be empty. The endpoint uses the existing QStash signing keys.
Confirm a scheduled delivery returns HTTP 200, including when the batch is empty.

Each run claims up to 20 level or topic vocabulary attempts pending for at
least five minutes, oldest eligible first. This includes attempts saved before
the migration. An interrupted run becomes eligible again after five minutes.
The regular XP worker locks each attempt and commits the award and processed
flag together. A repeated delivery is safe. Daily and sentence quizzes use
separate flows. Monitor the oldest unprocessed vocabulary attempt after an
outage to confirm the backlog drains.
