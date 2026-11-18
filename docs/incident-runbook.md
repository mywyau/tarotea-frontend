# Release and incident runbook

Last reviewed: 2026-11-18

## Release gate

Before promoting a build:

1. Confirm `npm test -- --run` and `npm run build` pass from `tarotea-frontend`.
2. Review the complete diff, including untracked files and database migrations.
3. Confirm no new personalized endpoint opts into public caching.
4. Confirm queue producers persist an idempotency record before publishing.
5. Record the deployment commit and the immediately previous known-good deployment.

After deployment, run the read-only smoke and cache-boundary checks at one virtual user. Do not run completion journeys unless dedicated test users and production-write approval are available.

## Initial triage

For an availability, latency, or correctness incident:

1. Record the first known failure time, affected journey, deployment commit, and visible HTTP status.
2. Check request telemetry for endpoint, latency, status, PostgreSQL pool wait, and sanitized rate-limit events.
3. Check Vercel function errors/concurrency, PostgreSQL connections, Upstash Redis latency/errors, and QStash backlog/retries over the same time window.
4. Decide whether the dominant failure is application release, PostgreSQL saturation, Redis failure, queue backlog, or an upstream CDN/provider failure.
5. Prefer the smallest reversible containment action below, then verify with a one-user smoke check.

Never paste access tokens, raw user IDs, session keys, quiz payloads, Stripe objects, or database URLs into incident notes.

## Roll back an application release

Use this when failures began immediately after a deployment and dependency health is otherwise normal.

1. In Vercel, identify the prior production deployment by commit and timestamp.
2. Promote that known-good deployment to production using the provider rollback/promote control.
3. Do not roll back a database migration until its backward compatibility and data effects have been reviewed separately.
4. Run the anonymous quiz, authenticated read, health, and cache-boundary smoke checks.
5. Confirm error rate and latency return to the pre-incident baseline before closing containment.

## Contain a QStash backlog

Use this when worker failures, PostgreSQL pressure, or a downstream rate limit causes queue age to grow.

1. Identify the affected flow from its destination and flow-control key in `docs/queue-operations.md`.
2. Pause or disable only that destination/flow in QStash; do not disable unrelated billing or deletion work.
3. Preserve persisted event/job rows and provider messages. Do not manually apply XP or billing state.
4. Fix or roll back the worker/dependency issue.
5. Resume at low concurrency, watch database pool wait and worker 5xx, then increase gradually.
6. Replay only persisted, unprocessed records through the normal producer or approved replay tool.

If account deletion is paused, notify support/operations because completion timing has user-facing and privacy implications.

## Respond to rate-limit failures

First distinguish legitimate rejection from a shared-bucket or Redis incident.

1. Group `rate_limit_rejected` events by limiter and subject type; identifiers are intentionally hashed.
2. If many unrelated guests fail one limiter, verify proxy IP forwarding and guest-subject construction before changing limits.
3. If Redis is unavailable, rate limits currently fail closed. Restore Redis or deploy a reviewed endpoint-specific policy; do not globally bypass limits for billing, AI, account, or finalization paths.
4. If a temporary limit increase is required, change only the affected endpoint constant, deploy it, record the old/new values and expiry time, and schedule the revert.
5. Never delete broad `rl:*` namespaces. Resolve an exact limiter and time window first.

## Invalidate caches

Follow `docs/cache-policy.md`.

- Prefer a namespace-version increment for incompatible public content.
- For a single incorrect personalized cache, repair PostgreSQL first and delete only the resolved user/cache key.
- Do not delete quiz-session keys during an active incident unless abandoning those sessions is an explicit containment decision.
- After invalidation, verify a cold request, cache-hit request, and mutation/worker refresh.

## PostgreSQL saturation

1. Check total, idle, waiting, slow acquisition, acquisition failure, and query failure telemetry.
2. Reduce or pause database-heavy queue flows before changing the connection pool.
3. Roll back a release that introduced the wait spike or query regression.
4. Do not raise the per-instance pool above the calculated provider budget; serverless instance multiplication can worsen saturation.
5. Capture the slow endpoint and run its query plan against production-like data after containment.

## Redis degradation

- Public/content caches fall back to authoritative CDN or PostgreSQL sources where documented.
- Quiz sessions, pronunciation locks, and rate limits fail closed for correctness and abuse protection.
- Avoid retry loops from the application layer; they amplify provider pressure.
- Verify recovery through one content request, one quiz start, one finalization, and the rate-limit boundary test.

## Closeout

An incident is contained only when the affected journey succeeds, error/latency signals return to baseline, queues are draining, and no manual replay remains undocumented. Record cause, impact window, containment, replay count, permanent fix, and one prevention action in a redacted incident note.
