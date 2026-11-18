# Dependency failure drill

Last reviewed: 2026-11-18
Status: defined, not yet executed

## Purpose and safety gate

This drill verifies detection, containment, recovery, and evidence for the three
scale failure modes most likely to cascade: PostgreSQL saturation, Redis
degradation, and QStash backlog.

Run in staging by default. A production drill requires explicit approval for
the scenario, time window, traffic ceiling, provider-cost ceiling, owner, and
abort authority. Never disable or corrupt a production dependency merely to
simulate failure. Prefer provider test controls, a scoped staging credential,
or a reviewed fault-injection configuration.

Do not start unless:

- the current deployment passed unit tests, production build, and read-only
  smoke checks;
- dashboards and notification destinations are visible to participants;
- the previous known-good deployment and rollback owner are recorded;
- queue pause/resume access is confirmed;
- no unrelated customer incident is active; and
- one participant is assigned to abort the drill independently of the person
  injecting the fault.

## Shared evidence

For every scenario record UTC timestamps for injection, first detection,
acknowledgement, containment, recovery, and passing smoke verification. Capture
the deployment commit, alert payload, affected journey, p95/p99 latency, error
rate, database pool metrics, Redis metrics, queue age, and any manual action.
Redact identifiers and credentials.

Success means the expected alert fires, the runbook identifies the correct
failure class, containment prevents cascading damage, recovery is observable,
and the read-only post-deploy gate passes afterward. A drill that exposes a
missing signal or unsafe manual step is still useful but is recorded as failed
until the gap is fixed and retested.

## Scenario A: PostgreSQL saturation

### Injection

In staging, use a bounded connection/load fixture or temporarily lower the
staging pool/provider connection allowance. Do not point a synthetic connection
storm at production. Increase pressure gradually and stop at the first critical
condition.

### Expected signals

- pool waiting rises above zero;
- acquisition p95 crosses 100 ms before acquisition failures appear;
- affected API latency rises and sanitized database metrics identify the class;
- the PostgreSQL warning/critical alert fires at the configured threshold.

### Containment and abort

Pause database-heavy queue flows first, stop synthetic traffic, then roll back
a query-regressing release if applicable. Abort immediately at 80% of the hard
connection limit, any sustained customer 5xx increase, or loss of administrative
database access. Do not raise the per-instance pool during the incident.

### Recovery proof

Waiting returns to zero, acquisition p95 returns below target, queues resume in
small batches, and anonymous plus authenticated read-only smoke checks pass.

## Scenario B: Redis unavailable or slow

### Injection

Use a staging-only invalid Redis credential, provider test control, or scoped
network fault. Test latency and hard failure separately if the platform permits.
Do not delete keys or flush a namespace.

### Expected behavior

- deterministic content falls back to its authoritative CDN/database source as
  documented in `docs/cache-policy.md`;
- rate limits, quiz sessions, and correctness locks fail closed;
- no application retry loop amplifies Redis pressure;
- Redis errors and affected route latency are visible without raw keys.

### Containment and abort

Restore connectivity rather than globally bypassing limits or sessions. Abort
if billing/finalization safety controls can no longer fail closed or if fallback
traffic threatens PostgreSQL capacity.

### Recovery proof

One cold content request, one warm content request, one quiz start, and the
rate-limit boundary behave normally. Confirm cache repopulation does not create
a request spike and the cache-isolation smoke gate passes.

## Scenario C: QStash backlog

### Injection

In staging, pause one non-billing XP destination or configure its worker to
return a controlled retryable failure. Publish only persisted, idempotent test
events. Never inject account deletion or billing failures for the first drill.

### Expected signals

- retry count and oldest-message age rise;
- the 60-second warning and five-minute critical queue-age thresholds behave as
  configured;
- persisted events remain unprocessed and are not applied twice;
- unrelated flow-control keys continue draining.

### Containment and abort

Pause only the affected flow, remove the injected fault, then resume at low
concurrency. Abort if duplicate XP appears, database pool wait rises, or another
queue flow stops draining.

### Recovery proof

Backlog and oldest age return to zero, every test event is processed exactly
once, retry/exhaustion alerts clear, and one replay candidate passes the guarded
procedure in `docs/queue-operations.md`.

## Drill report

Create a dated redacted report containing:

| Field | Result |
| --- | --- |
| Environment and deployment | |
| Scenario and approved fault | |
| Expected versus observed alerts | |
| Time to detect / contain / recover | |
| Customer-visible impact | |
| Abort conditions reached | |
| Smoke result after recovery | |
| Missing signal or unsafe step | |
| Owner and due date for each correction | |
| Retest date | |

Do not mark the roadmap drill item complete until all three scenarios have
dated evidence or an explicitly accepted staged schedule for the remaining
scenario.
