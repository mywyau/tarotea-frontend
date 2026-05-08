# Stripe billing scaling and reliability runbook

_Last updated: 2026-05-08_

This runbook covers the database and queue/cache infrastructure changes needed for the Stripe webhook payment flow.

## Deployment order

1. Run the database migration below before deploying application code that references `processing_started_at` or `processing_attempt_count`.
2. Deploy the application changes.
3. Verify webhook processing metrics and the stale-processing recovery query.

## Required database migration

Run the following SQL against the production Postgres database. `create index concurrently` statements must run outside a transaction block.

```sql
alter table stripe_events
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_attempt_count integer not null default 0;

create unique index concurrently if not exists stripe_events_event_id_uidx
  on stripe_events (event_id);

create index concurrently if not exists stripe_events_user_received_at_idx
  on stripe_events (user_id, received_at desc);

create index concurrently if not exists stripe_events_status_received_at_idx
  on stripe_events (status, received_at);

create index concurrently if not exists stripe_events_subscription_received_at_idx
  on stripe_events (stripe_subscription_id, received_at desc)
  where stripe_subscription_id is not null;

create index concurrently if not exists stripe_events_processing_started_at_idx
  on stripe_events (processing_started_at)
  where status = 'processing';
```

## Optional cleanup and retention

Stripe payloads are stored as JSONB for auditability, but they can grow quickly. Keep recent events hot and either archive or trim old payloads after your compliance window.

Example operational query for stale events:

```sql
select event_id, event_type, status, received_at, processing_started_at, processing_attempt_count, error_message
from stripe_events
where status in ('received', 'failed')
   or (status = 'processing' and processing_started_at < now() - interval '15 minutes')
order by received_at asc
limit 100;
```

## QStash flow-control guidance

Stripe events should be serialized per Stripe subscription or customer, not globally. The application passes a flow-control key in this order:

1. `stripe-subscription:<subscription id>`
2. `stripe-customer:<customer id>`
3. `stripe-webhooks` fallback

Watch for too many jobs using the fallback key. A high fallback rate usually means an event type does not expose customer/subscription IDs or extraction logic needs to be updated.

Recommended QStash settings for billing jobs:

- Keep `parallelism: 1` per subscription/customer to avoid out-of-order entitlement writes.
- Keep retries enabled for transient Stripe/Postgres failures.
- Alert on growing queue age, failed delivery count, and a high number of `stripe_events.status = 'failed'` rows.

## Observability checklist

Track these metrics in your logging/metrics platform:

- Webhook received count by `event_type`.
- Webhook enqueue success/failure count.
- `stripe_events` count by `status`.
- p95/p99 time from `received_at` to `processed_at`.
- Number of stale `processing` rows older than 15 minutes.
- Stripe API retrieve latency and failure rate.
- Entitlement sync failures by `stripe_subscription_id` and `user_id`.

## Incident recovery

If events are stuck in `received` or `failed`, either resend the original Stripe webhook from the Stripe dashboard or enqueue/process the stored event IDs with the internal worker path.

If events are stuck in `processing` longer than 15 minutes, the application can reclaim them on the next worker attempt. You can also reset them manually after confirming no worker is actively processing them:

```sql
update stripe_events
set status = 'failed',
    processing_started_at = null,
    error_message = 'Manually reset stale processing event for retry'
where status = 'processing'
  and processing_started_at < now() - interval '15 minutes';
```
