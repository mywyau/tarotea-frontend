# Route cache classification

Last reviewed: 2026-11-18

## Policy

All `/api/**` responses default to `Cache-Control: private, no-store`. A handler may opt into public caching only after it has successfully produced a deterministic response that is independent of authentication, cookies, entitlements, progress, unlocks, request bodies, and user-specific headers.

Public content uses:

`public, max-age=60, s-maxage=600, stale-while-revalidate=86400`

This permits a one-minute browser copy, a ten-minute shared-edge copy, and stale serving while the edge revalidates for up to one day. Error responses retain the private default because handlers apply the public header only after the upstream CDN fetch succeeds.

## Classification

| Class | Examples | Policy |
| --- | --- | --- |
| Immutable build assets | `/_nuxt/**` | One year, public, immutable |
| Deterministic CDN proxy content | Level/topic indexes, word details, vocab JSON, sentence JSON | Explicit bounded public/edge caching after success |
| Public but dynamic aggregate | `/api/total-users-stats` | Existing 60-second shared cache with five-minute stale revalidation |
| Personalized reads | Access checks, quiz starts, progress, stats, unlocks, billing, AI usage, account data | Private, no-store |
| Mutations | Finalizers, unlock purchase, account/profile changes, pronunciation checks, webhooks | Private, no-store |
| Workers and queue callbacks | XP, Stripe, and deletion workers | Private, no-store; QStash signature verification remains mandatory |
| Health | `/api/health` | No-store |
| HTML application shell | Page routes | `private, no-cache`; pages read per-request preference/session cookies during SSR, so shared caching is unsafe |

## HTML decision

The application shell is not currently deterministic across requests. Page
components read cookies such as audio voice, word-page display preferences, and
the anonymous online-session identifier during SSR. Even where those values do
not visibly alter every page, they can enter Nuxt request state or rendered
payloads.

HTML therefore uses `private, no-cache`: a browser may retain its own copy but
must revalidate it, and shared caches must not reuse it for another learner.
Hashed `/_nuxt/**` assets remain public and immutable. Public HTML edge caching
should only be introduced through an explicit route allowlist after its SSR
data and cookie reads are removed or proven request-independent.

## Explicit public endpoints

- `/api/index/levels/:id`
- `/api/index/topics/:id`
- `/api/topic/:id`
- `/api/words/:id`
- `/api/vocab-quiz/:id`
- `/api/sentences/:id`
- `/api/sentences/topics/:id`
- `/api/topic/sentences/:id`
- `/api/total-users-stats`

The authenticated `/api/index/levels/:slug` access wrapper, quiz-generation endpoints, and all v2 quiz endpoints are not public-cache candidates even when some anonymous responses appear deterministic; their output can vary by entitlement, unlock state, or progress.

## Verification after deployment

1. Request a public endpoint twice and verify `Cache-Control` and the provider cache-status header show a miss followed by a hit.
2. Request an authenticated endpoint and verify `private, no-store` with no shared-cache hit.
3. Request a missing public content ID and verify the error remains private/no-store.
4. Confirm an authenticated response never appears when repeating the same URL without authorization.
5. Request an HTML page with preference cookies and verify it remains `private, no-cache` with no shared-cache hit.
