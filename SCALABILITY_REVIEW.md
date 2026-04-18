# Scalability Review (April 17, 2026)

## Scope
This review is based on a code walkthrough of key runtime and infrastructure paths:

- Nuxt/Nitro runtime configuration
- Database and Redis client setup
- Worker queueing + async processing path
- API rate-limiting utility

## What is already scalable

1. **Asynchronous offloading for heavy quiz finalization**
   - Quiz scoring/workload is processed asynchronously via QStash worker jobs rather than only on the user-facing request path.
2. **Batch SQL updates in worker**
   - Worker logic applies batched updates using `unnest(...)` arrays, which scales better than per-word updates.
3. **DB pooling is configured**
   - Postgres uses a shared pool with explicit `max`, idle, and connection timeout settings.
4. **Redis-based rate limiting utility exists**
   - Centralized limit enforcement is available to protect hot endpoints.

## Scalability risks found

1. **Critical queue target mismatch (fixed in this branch)**
   - `queueXpQuizWorker` was publishing jobs to `/api/worker/xp-quiz-v3`, but the implemented worker route is `xp-quiz-v5`.
   - Impact: queue retries + failed jobs under load, wasted QStash attempts, and user progress lag.
   - **Fix applied:** queue now publishes to `/api/worker/xp-quiz-v5`.

2. **Global HTML no-cache policy increases origin load**
   - Route rule `"/**"` sets `Cache-Control: no-cache` for all pages, which forces revalidation and can increase request volume at scale.

3. **CSS code splitting disabled**
   - `vite.build.cssCodeSplit = false` can make CSS payloads larger on every page load, increasing bandwidth and render cost as the app grows.

4. **Small DB pool default may bottleneck bursts**
   - Pool `max: 8` is conservative. On serverless concurrency spikes, this can throttle throughput or increase wait times.

## Recommended next steps (priority order)

1. **Observe worker success/error rate after route fix**
   - Add/verify metrics around worker HTTP status and QStash retries.

2. **Introduce selective page caching strategy**
   - Keep auth-sensitive pages uncached, but allow short edge caching for public/marketing content.

3. **Re-enable CSS code split (or validate current tradeoff)**
   - Benchmark first-contentful render and total transfer with/without code split.

4. **Tune DB pool + query latency with production telemetry**
   - Validate pool size against p95 traffic and DB connection limits.

5. **Apply rate limiter consistently to high-cost API routes**
   - Confirm endpoints with expensive DB/AI/third-party calls are protected.

## Quick conclusion
The architecture is generally on the right track for scaling (async workers, batching, pooled DB). The most urgent issue was the queue→worker route mismatch, which is now corrected in this branch. The next biggest wins are cache strategy tuning and payload optimization.
