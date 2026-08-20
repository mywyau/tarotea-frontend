# Database schema (current)

_Last updated: 2026-06-11_

For a restorable snapshot of the complete live PostgreSQL schema, see
[Database schema snapshots](database/README.md). Refresh and commit the snapshot
after every schema migration with `npm run db:schema:dump`.

## users

Stores Auth0 users mirrored into the app DB.

Columns:
- id (text, PK) — Auth0 `sub`
- email (text)
- first_name (text, nullable)
- last_name (text, nullable)
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
