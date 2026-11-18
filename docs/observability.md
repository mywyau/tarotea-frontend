# Production observability specification

Last reviewed: 2026-11-18

This specification defines the minimum dashboards and alerts for the initial
scale target. Provider configuration remains pending until Vercel, PostgreSQL,
Upstash, QStash, and Grafana access is available.

## Data handling

- Use route templates or controlled endpoint groups, never raw URLs containing
  IDs or slugs, as metric labels.
- Do not label metrics with user, session, customer, subscription, message, or
  attempt IDs. Even hashed identifiers are for short-lived diagnostic logs, not
  metric dimensions.
- Do not log authorization headers, cookies, database URLs, SQL parameters,
  quiz payloads, Stripe objects, or QStash signed bodies.
- Keep the cardinality of status labels to status class for overview panels;
  retain exact status only in drill-down logs.
- Annotate dashboards with deployment commit and time, rollback, load-test
  windows, and material configuration changes.

## Dashboard: learner API

Use one-minute resolution for incident views and a seven-day comparison view.

| Panel | Breakdown | Initial display |
| --- | --- | --- |
| Request rate | route group and status class | requests/second |
| Availability | public read, quiz start, finalization, account/billing, AI | non-2xx/expected-4xx percentage |
| Latency | same route groups | p50, p95, p99 |
| Rate limits | limiter and `user`/`guest`/special subject type | 429 count and percentage |
| Serverless execution | function/route group | invocations, duration, errors, concurrency, cold starts if available |
| Response delivery | public content versus personalized API | response bytes and cache status |

Expected 400/401/403/404 responses must be classified separately from
unexpected failures so authentication probes and bad client input do not hide
5xx regressions.

## Dashboard: dependencies

| Dependency | Required panels |
| --- | --- |
| PostgreSQL | active/idle/waiting connections, percentage of hard limit, acquisition p50/p95/p99, slow acquisitions, acquisition failures, query failures |
| Upstash Redis | commands, commands per learner journey during baselines, latency p95/p99, errors, bandwidth, key eviction/memory signals available on the plan |
| QStash | publish rate, delivery p95, retry count, exhausted deliveries, oldest message age, backlog by flow-control key, worker 5xx |
| CDN/content origin | hit/miss/revalidation ratio, origin errors, transferred bytes, latency |
| Stripe/OpenAI/audio providers | request rate, latency, throttles, failures; no request or customer payloads |

## Initial alert matrix

Tune these after the first dated production baseline. Alerts should include the
affected route/flow, first firing time, relevant deployment annotation, and a
link to `docs/incident-runbook.md`.

| Alert | Warning | Critical | Window |
| --- | --- | --- | --- |
| Public/read or quiz-start availability | unexpected failures >= 0.5% | >= 1% | 5 minutes with minimum traffic |
| API latency | p95 >= 1,000 ms | p99 >= 2,500 ms | 10 minutes |
| Quiz finalization | p95 >= 1,500 ms | unexpected failure >= 1% | 5 minutes |
| PostgreSQL connections | >= 70% of hard limit | >= 80% | 5 minutes |
| PostgreSQL acquisition | p95 >= 100 ms or any waiting | acquisition failures > 0 | 5 minutes / immediate failure |
| Redis | elevated provider latency or errors | sustained errors/throttling | 5 minutes |
| Unexpected rate limiting | any new shared/unknown guest pattern | journey failure caused by 429s | immediate after minimum sample |
| Queue age | oldest >= 60 seconds | oldest >= 5 minutes | 5 minutes |
| Queue delivery | retries rising | exhausted delivery > 0 or worker 5xx >= 1% | 5 minutes / immediate exhaustion |
| Provider throttle | any sustained 429 from paid dependency | customer journey unavailable | 5 minutes |

Low-traffic percentage alerts require a minimum request count and should be
paired with an absolute failure-count condition. Otherwise one expected probe
can create noise. Billing, account deletion, and terminal queue failures should
page on one verified failure because their traffic is naturally sparse.

## Release view

For the 30 minutes after each production deployment, show the new and previous
commit side by side where the platform supports it:

- request/error/latency change by route group;
- PostgreSQL acquisition and connection change;
- Redis command and error change;
- QStash retry/backlog change; and
- cache hit ratio and transferred-byte change.

The post-deploy smoke and cache-boundary results should be linked from the
deployment annotation. A release is not healthy merely because the deployment
completed; it needs a passing smoke result and stable dependency signals.

## Wiring checklist

- Confirm metric/log sources and retention for each provider.
- Create route-group normalization before ingesting request paths.
- Add the two dashboards above and deployment annotations.
- Configure warning and critical notification destinations and ownership.
- Test every alert with a synthetic or provider test event where possible.
- Record screenshots or exported configuration in the dated baseline report.
- Review thresholds after each capacity baseline and material architecture
  change.
