# Rate-limit policy

Last reviewed: 2026-11-18

Rate limits are fixed-window controls backed by one atomic Redis script. A
rejection emits a sanitized `rate_limit_rejected` event containing the limiter,
subject type, configured boundary, and reset time. Raw identifiers are not
logged.

These are application safety boundaries, not capacity targets. Revisit values
only with production traffic evidence, rejection telemetry, and provider cost
limits. A load test must stop on unexpected 429 responses rather than raising a
limit to make the test pass.

## Endpoint groups

| Group | Current routes | Subject | Current boundary | Purpose |
| --- | --- | --- | --- | --- |
| Public presence read | `GET /api/current-users` | IP | 240/minute | Bound polling and Redis reads |
| Presence heartbeat | `POST /api/current-users` | IP plus session prefix | 120/minute per IP and 6/minute per session | Permit shared networks while bounding one browser |
| Account read | `GET /api/meV2` | user | 1,200/minute | High ceiling for existing UI polling; observe before reducing |
| Account/auth mutation | profile update, post-login sync | user | 60/minute profile; 10/minute post-login | Bound database writes and identity synchronization |
| Billing session creation | Stripe checkout and portal | user, shared group | 10/minute | Bound external session creation while allowing UI/network retries |
| Daily finalization | daily vocabulary and Jyutping finalizers | user, shared group | 10/minute | Bound row locks, event persistence, and queue publication |
| Quiz/content start | topic word/audio, sentence and typing starts | user or guest IP | 20/minute per route family | Bound session creation and content assembly |
| Quiz finalization | grind, level/topic sentence, level/topic/standalone typing | user | 10/minute grind; 20/minute other finalizers | Bound progress writes and queue publication |
| Pronunciation/AI | pronunciation analysis and tone scoring | user/device/IP | paid 20/minute; free 5/minute plus 15/device/day and 30/IP/day; tone scoring 60/minute | Bound paid provider use and abuse |

The standalone typing-sentence finalizer is intentionally included at
20/minute; it previously had no request boundary even though the equivalent
level and topic finalizers did.

## Subject rules

- Authenticated optional-access routes use `user:<id>`.
- Anonymous quiz starts use `guest:<forwarded IP>`; they never share one global
  guest key.
- Presence uses an IP boundary and a normalized session boundary because it is
  intentionally anonymous and frequently polled.
- Free pronunciation adds device and hashed-IP daily boundaries because it
  invokes a paid provider.
- When a trustworthy IP is unavailable, optional-access routes fall back to
  `guest:unknown`. Monitor this subject: repeated traffic indicates a proxy
  forwarding configuration problem, not a reason to create a global bucket.

## Anonymous shared-network evaluation

An IP-only guest boundary prevents trivial cookie rotation but can group many
legitimate learners behind a school, office, mobile carrier, or household NAT.
A session-only boundary is fairer but is not abuse-resistant because a caller
can discard or invent client cookies. The existing `online_session_id` cookie is
browser-generated for presence tracking, is not guaranteed on direct quiz entry,
and must not become the sole rate-limit identity.

The intended follow-up design is a dual boundary:

- a server-issued opaque guest-session cookie with the normal per-journey limit;
- a higher per-IP backstop to bound session rotation and aggregate abuse; and
- one atomic two-key Redis script so both counters either advance together or
  neither does.

Do not ship the dual boundary until production 429 telemetry establishes a
reasonable IP backstop and the cookie lifecycle has been specified. Until then,
the per-IP guest subject is the safer default, with `guest:unknown` monitored as
a proxy-configuration error. This is a deliberate interim decision, not a
claim that IP identity is equivalent to one learner.

## Coverage gaps and decisions

These routes need an evidence-backed policy before the endpoint-group phase is
fully enforced across the whole API:

- Stripe webhooks must remain governed by signature verification and event
  idempotency rather than a user/IP limiter.
- `/api/jyutping/finalize` has no current frontend caller and uses a superseded
  unsigned, fire-and-forget internal worker request. Keep it out of new clients
  and remove it after access logs confirm no supported old client uses it.
- `/api/sentences/jyutping/finalize` contains no active handler and is also a
  removal candidate.
- Anonymous session-plus-IP composition may improve shared-network fairness,
  but requires the server-issued cookie and measured IP backstop described
  above.

## Change procedure

1. Use 429 telemetry and the dated performance baseline to identify the exact
   limiter and affected subject type.
2. Verify the UI is not retrying or double-submitting unexpectedly.
3. Change only the relevant route family and add a boundary test.
4. Record old/new values, reason, deployment, and review date.
5. Run one-user smoke checks before any staged learner load.
