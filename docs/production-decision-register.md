# Production decision register

Last updated: 2026-11-18
Local engineering status: validated; deployment and production evidence pending

This register contains the information or authorization required to continue
the scale-readiness roadmap. Values should be recorded here or linked from a
dated performance report; secrets must never be copied into this document.

## Required owner inputs

| Decision | Why it is required | Evidence/input needed | Unblocks |
| --- | --- | --- | --- |
| Near-term traffic target | Capacity cannot be judged without a workload | Expected simultaneous learners, peak requests/second, and growth horizon | Baseline pass/fail criteria and headroom recommendation |
| Production deployment | Local behavior cannot prove deployed correctness | Deployment commit, UTC time, previous known-good deployment | Quiz verification, cache checks, post-deploy evidence |
| Database topology | Eight connections per warm function may exceed a serverless database budget | Provider/plan, hard connection limit, reserved connections, pooler product/mode, region | Safe per-instance pool size and connection alerts |
| Production-safe test window | k6 creates real traffic and provider cost | Approver, UTC window, maximum 25 VUs or lower ceiling, cost ceiling, abort owner | Smoke and staged learner baseline |
| Metrics access | k6 alone cannot identify the saturated dependency | Read access or exported snapshots for Vercel, PostgreSQL, Upstash, QStash, CDN, and Grafana | Dependency attribution, Redis budget, queue and cache measurements |
| Observability destination | Alert configuration needs an owner and notification path | Dashboard platform, warning destination, critical/page destination, retention policy | Production dashboard and alert wiring |
| Fault-injection environment | Dependency failures must not be improvised in production | Staging environment/credentials or specifically approved provider test controls | PostgreSQL, Redis, QStash, and provider failure drill |

## Evidence-dependent engineering decisions

### PostgreSQL pool and timeouts

Do not change `max: 8` until the provider facts and peak function concurrency
are known. Calculate:

```text
available = hard limit - admin/migration/other-service reserve
candidate per-instance max = floor(available / peak concurrent instances)
```

Choose a lower value with operational headroom. Query and statement timeouts
must follow p95/p99 measurements for interactive reads, finalizations, and
workers; one global guess could terminate valid workers or leave interactive
queries running too long.

### Query plans and indexes

Run the roadmap's `EXPLAIN (ANALYZE, BUFFERS)` set against production-like data,
not an empty development database. Add indexes only when the plan shows a
measured scan, sort, lock, or lookup problem and record before/after plans.

### Anonymous session plus IP limiting

The dual-boundary design is documented in `docs/rate-limit-policy.md`. Its IP
backstop must be selected from real 429 distributions and shared-network usage.
Implementation also requires a server-issued guest-session lifecycle; the
browser-generated presence cookie is not a security identity.

### Dormant finalizers

Before removing `/api/jyutping/finalize` and the inactive
`/api/sentences/jyutping/finalize`, query production access logs over an agreed
legacy-client window. Remove them if there are no supported callers; otherwise
identify the client/version and migrate it to the persisted, idempotent v2/v3
flows before removal.

### Queue replay tool

The replay procedure is defined, but implementation requires a choice of
operator boundary: restricted CLI with production database/QStash credentials,
or an authenticated administrative endpoint. The owner must select the access
model and audit destination. The tool may accept only existing persisted event
IDs and must never allow arbitrary worker payloads.

### Echo Lab asynchronous processing

The current queue endpoint records `queued` state but does not publish work.
Concurrency, retry, failure callback, and replay controls should be implemented
with the actual worker queue, not speculatively on the synchronous process
route. This is a feature architecture decision rather than a tuning change.

## Approved execution sequence

Once the inputs above are available:

1. Deploy the validated batch and record the deployment annotation.
2. Run `scripts/post-deploy-smoke.sh` at one VU with explicit approval.
3. Verify anonymous and paid word, audio, and sentence quiz journeys manually.
4. Complete the dated baseline report at 1, 5, 10, then 25 VUs, stopping at its
   defined safety thresholds.
5. Use provider metrics to select the database pool, timeout, Redis, cache, and
   queue changes; do not tune multiple dependencies from one ambiguous signal.
6. Wire and test alerts, then execute the staged failure drill.
7. Re-run the smoke and baseline gates and record the final safe operating
   point and headroom.

## Current validation evidence

- `npm test -- --run`: 31 test files and 117 tests pass.
- `npm run build`: production Vercel build passes.
- Application and performance repositories pass `git diff --check`.
- Cache-boundary k6 JavaScript and the post-deploy shell wrapper pass syntax
  validation.
- No production traffic, deployment, commit, provider mutation, or destructive
  operation was performed as part of the local scale-readiness batch.
