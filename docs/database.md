# Database schema (current)

_Last updated: 2026-02-06_

## users

Stores Auth0 users mirrored into the app DB.

Columns:
- id (text, PK) — Auth0 `sub`
- email (text)
- created_at (timestamptz)
- stripe_customer_id (text, nullable)
- deleting_at (timestamptz, nullable)

Notes:
- Users are recreated on login via `/api/auth/post-login`
- Deletion sets `deleting_at` before cascading deletes

---

## entitlements

Tracks access level and billing state.

Columns:
- user_id (text, PK, FK → users.id)
- plan (text) — free | monthly | yearly
- subscription_status (text)
- cancel_at_period_end (boolean)
- current_period_end (timestamptz)
- canceled_at (timestamptz, nullable)

Notes:
- Stripe is source of truth for billing
- Entitlements default to `free`
- Deleted when user is deleted
