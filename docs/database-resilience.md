# Database resilience policy

Last reviewed: 2026-11-18

## Current runtime behavior

- The Vercel runtime uses one `pg` pool per warm function instance and attaches
  it to Vercel's pool lifecycle integration.
- The configured per-instance pool maximum is 8 connections. This is not yet a
  confirmed production-safe number because the provider's hard connection
  limit, reserved connections, pooler mode, and peak function concurrency are
  still unknown.
- Waiting for a new connection fails after 2 seconds.
- Idle clients are released after 10 seconds.
- There is currently no application-wide query or PostgreSQL statement timeout.
- Pool acquisition failures, slow acquisitions at 100 ms or more, query
  failures, and idle-client errors emit sanitized telemetry without SQL or
  parameters.

## Retry policy

- API writes and quiz finalizations are not automatically retried inside the
  request. Retrying a transaction or queue publication without its idempotency
  boundary can duplicate progress or side effects.
- Reads are not automatically retried at the repository layer. A broad retry
  during saturation would multiply database pressure and extend serverless
  execution time.
- QStash performs bounded delivery retries for asynchronous work. Workers must
  use persisted event/session identity so redelivery is idempotent; see
  `docs/queue-operations.md`.
- Clients may retry an explicitly idempotent read with bounded backoff, but must
  not retry 429 responses before their reset window or blindly repeat a
  finalization.

## Choosing safe limits

Do not raise the pool maximum or add one global statement timeout until the
production baseline identifies connection headroom and real query durations.
Use this budget after the provider facts are known:

```text
available connections = hard limit - reserved/admin/other-service connections
per-instance maximum <= floor(available connections / peak concurrent instances)
```

Retain operating headroom rather than allocating the full result. A pooled or
transaction-pooler URL must be identified before relying on this calculation.

Query timeouts should be assigned by workload class after measuring p95/p99:
interactive reads, interactive writes/finalization, and background workers may
need different ceilings. PostgreSQL `statement_timeout` is preferred as the
server-side safety boundary; any client timeout must account for the fact that
abandoning a promise does not necessarily cancel server work.

External synchronous providers are bounded separately: OpenAI and Stripe calls
use a 20-second per-request timeout and at most one SDK retry. Application-level
write retries remain prohibited unless the operation has an explicit
idempotency key or persisted event boundary.

## Incident behavior

When acquisition wait or failures rise, pause database-heavy queue consumers
and roll back query regressions before increasing connections. Do not add
immediate application retries. Follow `docs/incident-runbook.md` and capture
query plans against production-like data after containment.
