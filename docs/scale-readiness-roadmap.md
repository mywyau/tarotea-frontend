# TaroTea scale-readiness roadmap

Status: active  
Owner: application engineering  
Last updated: 2026-11-18

## Objective

Prepare TaroTea to absorb sustained learner growth without quiz failures, database connection exhaustion, excessive Redis cost, lost background jobs, or undetected performance regressions.

This is a living execution document. Work is ordered by risk reduction, not by architectural novelty. Each phase has evidence and exit criteria so infrastructure is changed only when measurements justify it.

## Current foundations

- Nuxt/Nitro runs on Vercel serverless functions.
- PostgreSQL uses a shared `pg` pool with Vercel pool lifecycle integration.
- Upstash Redis stores rate limits, progress caches, unlock caches, and quiz sessions.
- QStash handles XP, billing, deletion, and other asynchronous work.
- Static learning content is served from a CDN.
- The performance-test repository already contains k6 smoke, learner-journey, quiz-completion, and dojo-completion scenarios.
- Request telemetry samples successful traffic and retains errors and slow requests.

## Service targets

These are initial engineering targets and should be revised after the first production baseline.

| Signal | Initial target |
| --- | --- |
| Public/read API availability | >= 99.9% |
| Authenticated quiz start availability | >= 99.9% |
| Unexpected HTTP failures | < 1% during normal load |
| API latency | p95 < 1,000 ms; p99 < 2,500 ms |
| Quiz finalization acknowledgement | p95 < 1,500 ms |
| Queue age | p95 < 60 seconds |
| PostgreSQL pool wait | p95 < 100 ms |
| Rate-limit false positives | 0 known shared-bucket incidents |

## Phase 0: correctness before load

- [x] Give anonymous topic word quizzes an individual rate-limit subject.
- [x] Give anonymous topic audio quizzes an individual rate-limit subject.
- [x] Send authentication when paid users load level audio quizzes.
- [x] Return the complete Level 1 sentence quiz to anonymous learners.
- [x] Add regression coverage and run the full test suite and production build.
- [ ] Deploy the changes and verify word, audio, and sentence quizzes logged out and with a paid account.

Exit criteria: the affected production journeys work without login where intended, and paid users receive full paid-level content.

## Phase 1: establish a production baseline

- [ ] Record the expected near-term concurrency and requests-per-second target.
- [ ] Run the production-safe k6 smoke test at low volume.
- [ ] Run the read-only learner journey at 1, 5, 10, and 25 virtual users.
- [ ] Capture p50, p95, p99, failure rate, 429 rate, and endpoint-specific results.
- [ ] Capture PostgreSQL active connections and connection wait time during each run.
- [ ] Capture Upstash command count, latency, errors, and bandwidth during each run.
- [ ] Capture QStash delivery latency, retries, failures, and backlog.
- [ ] Save dated results in `tarotea-performance-tests/reports/`.

Exit criteria: a repeatable baseline identifies the first saturated dependency and can be rerun before releases.

Production load tests require explicit approval because they create traffic and may incur provider costs. Mutating completion journeys must use dedicated test users.

## Phase 2: make request controls efficient and reliable

- [x] Make rate-limit increment and expiry atomic so a failed request cannot leave a permanent key.
- [x] Reduce rate limiting to one Redis transaction or script per request.
- [x] Standardize rate-limit subjects for authenticated users and anonymous IP fallback.
- [x] Evaluate anonymous session plus IP limits and document the server-issued dual-boundary design.
- [ ] Implement the dual boundary after production 429 data establishes the IP backstop.
- [x] Inventory and document endpoint groups and current limits for reads, quiz starts, finalization, AI, and billing.
- [x] Add shared group limits to active billing-session and daily-finalization routes.
- [ ] Confirm dormant legacy finalizers have no supported callers, then remove them.
- [x] Add tests for independent guest buckets, expiry, and rejection boundaries.
- [x] Emit sanitized 429 events by limiter and subject type without raw identifiers.

Exit criteria: no global anonymous buckets, no non-expiring limiter keys, and a measurable 429 rate per endpoint class.

## Phase 3: protect PostgreSQL

- [ ] Confirm the production database's hard connection limit and whether `DATABASE_URL` uses a serverless connection pooler.
- [ ] Calculate the safe per-instance pool size from the provider limit and expected function concurrency.
- [x] Add active, idle, and waiting PostgreSQL pool counts to sampled API telemetry.
- [x] Instrument pool acquisition time and query failures.
- [x] Remove duplicate user/entitlement lookups from authenticated topic quiz hot paths.
- [x] Audit other authenticated hot paths for duplicate user/entitlement lookups.
- [ ] Run `EXPLAIN (ANALYZE, BUFFERS)` on quiz start, progress, stats, unlock, and worker queries using production-like data.
- [ ] Add or adjust indexes only from measured query plans.
- [x] Document current database acquisition timeout and retry behavior for read and write paths.
- [ ] Set workload-specific statement timeouts from measured query durations.

Exit criteria: load tests stay below the connection budget, pool wait meets target, and hot queries have documented plans.

## Phase 4: reduce Redis round trips and cache safely

- [x] Replace per-word `SISMEMBER` fan-out with a batch membership command or pipeline.
- [x] Transactionally batch word-unlock cache writes and expiry updates.
- [x] Transactionally batch active progress-cache hash writes with expiry updates.
- [x] Pipeline related progress-cache reads/expiry refreshes and multi-key invalidations where consistency permits.
- [x] Add a versioned TTL to shared topic quiz content caches.
- [x] Bound weakest-word scope caches with versioned 10-minute TTLs.
- [x] Audit remaining content caches and document invalidation.
- [x] Prevent same-instance cache stampedes on commonly requested topic content.
- [x] Define behavior when Redis is slow or unavailable for each feature.
- [ ] Track Redis requests per learner journey as a cost and latency budget.

Exit criteria: Redis round trips per core journey are bounded and failure behavior is intentional.

## Phase 5: edge caching and payload efficiency

- [x] Classify routes as immutable public content, short-lived public content, personalized content, or mutations.
- [x] Cache only public deterministic responses at the edge.
- [x] Keep personalized sessions and authenticated data private and non-cacheable.
- [x] Audit HTML request state and explicitly keep cookie-aware SSR pages private with revalidation.
- [x] Record a reproducible local production-build asset baseline.
- [ ] Measure journey transfer size, API payload size, and CDN hit rate in production before changing delivery rules.

Exit criteria: public traffic is served cheaply without leaking or mixing personalized responses.

## Phase 6: queue resilience and backpressure

- [x] Inventory every QStash producer and worker with retry and flow-control policy.
- [x] Document idempotency evidence and gaps for every mutating worker.
- [x] Add stable deduplication IDs to persisted session/event producers.
- [x] Specify alerts for delivery failure, retry exhaustion, queue age, and worker error rate.
- [ ] Wire queue alerts to production metrics and notification destinations.
- [x] Define dead-letter classification, recovery, replay gates, and audit requirements.
- [ ] Implement a restricted replay tool for persisted failed events.
- [x] Add concurrency controls for every active database-heavy QStash worker.
- [x] Bound synchronous pronunciation/AI work by subject and one in-flight request.
- [ ] Define concurrency for asynchronous Echo Lab processing when its worker queue is implemented.
- [x] Bound AI provider timeouts/retries and preserve retryable Echo Lab attempts during throttling or outages.
- [ ] Verify provider-failure behavior with controlled production or staging fault injection.

Exit criteria: jobs can be retried or replayed without duplicate XP, billing changes, or account operations.

## Phase 7: release and incident readiness

- [x] Add a production smoke suite for the most important anonymous and authenticated journeys.
- [x] Add an approval-gated, read-only post-deploy command that saves dated smoke evidence.
- [ ] Run read-only smoke checks after every production deployment.
- [x] Document rollback, queue pause, rate-limit override, and cache invalidation procedures.
- [x] Specify dashboards and alert thresholds tied to the service targets above.
- [ ] Wire and test dashboards and alerts in the production observability provider.
- [x] Define guarded PostgreSQL, Redis, and QStash failure-drill scenarios and evidence requirements.
- [ ] Run a failure drill for PostgreSQL saturation, Redis failure, and QStash backlog.

Exit criteria: releases have automatic evidence, and the team can detect and mitigate the main failure modes.

## Decisions or access needed from the owner

The actionable evidence, decision owner inputs, and exact unblock conditions
are maintained in `docs/production-decision-register.md`.

- Production concurrency or growth target.
- Database provider, connection limit, and pooling mode.
- Approval and timing for production load tests.
- Access to Vercel, PostgreSQL, Upstash, QStash, and Grafana metrics when measurements begin.
- Acceptable provider-cost ceiling for load tests and ongoing observability.

## Progress log

### 2026-11-18

- Diagnosed the free topic quiz failure as a shared anonymous rate-limit bucket.
- Updated topic word and audio quiz rate-limit subjects.
- Fixed authentication propagation for paid level audio quizzes.
- Fixed free Level 1 sentence access for anonymous learners.
- Added regression tests; 117 tests and the production build pass.
- Created this roadmap and began Phase 2 design while Phase 1 awaits production load-test approval.
- Replaced the multi-request rate limiter with one atomic Redis script and added boundary/configuration tests.
- Replaced per-word unlock membership calls with one `SMISMEMBER` request and added regression coverage.
- Batched word-unlock cache mutations into one atomic Redis transaction.
- Reused the session entitlement in topic word/audio quiz starts, removing one PostgreSQL query per authenticated request.
- Centralized authenticated/guest rate-limit subjects and added the missing limiter to sentence dojo starts.
- Moved topic quiz content to a shared versioned cache key with a 10-minute TTL.
- Versioned and bounded weakest-word level/topic scope caches.
- Centralized progress-hash writes so fields and expiries are applied atomically in one Redis request.
- Added sanitized rate-limit rejection events and PostgreSQL pool-pressure fields to request telemetry.
- Added `docs/queue-operations.md` with the active queue inventory, idempotency evidence, monitoring signals, and recovery procedure.
- Standardized stable QStash deduplication IDs, added missing queue flow control, and made account-deletion retries explicit.
- Instrumented PostgreSQL acquisition waits, acquisition failures, query failures, and idle-client errors without logging SQL or parameters.
- Established a Nuxt type-check baseline; it currently fails on existing application-wide typing debt, while the new database instrumentation reports no type errors.
- Audited authenticated access paths and consolidated XP/unlock-spend balance reads from two PostgreSQL queries to one shared query.
- Added `docs/cache-policy.md`, versioned the remaining typing-content namespaces, and coalesced concurrent topic-content cache misses.
- Made level and sentence typing content loaders fall back to authoritative CDN content when Redis reads or writes fail.
- Added private/no-store API defaults and bounded edge caching for deterministic CDN-proxy endpoints, documented in `docs/route-cache-classification.md`.
- Added a low-volume k6 cache-boundary smoke check for public content, anonymous quizzes, missing content, and authenticated user data.
- Added `docs/incident-runbook.md` covering release gates, rollback, queue containment, rate-limit response, cache invalidation, and dependency incidents.
- Added a repeatable production-baseline runbook and dated report template under `tarotea-performance-tests/reports/`.
- Added `docs/rate-limit-policy.md` and closed the missing rate-limit gap on the standalone typing-sentence finalizer.
- Normalized authenticated-only rate-limit keys to explicit `user` subjects for consistent sanitized telemetry.
- Recorded the local production-build asset baseline in `docs/delivery-baseline.md`.
- Documented current database pool timeouts and deliberate no-blind-retry behavior in `docs/database-resilience.md`.
- Reduced progress-cache reads plus TTL refreshes and paired invalidations to one Redis request each.
- Defined queue dead-letter classification and a guarded, auditable replay procedure.
- Audited SSR cookie usage and changed HTML caching from ambiguous `no-cache` to explicit `private, no-cache`.
- Added `docs/observability.md` with low-cardinality dashboards, initial thresholds, release annotations, and alert wiring gates.
- Added the missing global concurrency boundary to account-deletion jobs; every active database-heavy QStash flow is now bounded.
- Bounded OpenAI call duration/retries, sanitized provider errors, and made temporary Echo Lab failures safely retryable.
- Prevented exhausted free pronunciation quotas from continuing to mutate their monthly usage row.
- Refunds pronunciation allowance reservations when the AI provider call fails, so outages do not consume learner attempts.
- Added shared per-user limits to active Stripe session creation and daily finalization paths; documented two dormant legacy finalizers for removal verification.
- Bounded synchronous Stripe calls to 20 seconds and one network retry.
- Documented the anonymous shared-network tradeoff and the required atomic session-plus-IP follow-up design.
- Added an approval-gated post-deploy smoke wrapper that runs endpoint and cache-isolation gates and saves dated summaries.
- Added `docs/failure-drill.md` with safe injection, abort, recovery, and evidence gates for PostgreSQL, Redis, and QStash scenarios.
- Consolidated every production-dependent input and follow-up gate in `docs/production-decision-register.md`.
