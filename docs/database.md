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


---

## echo_lab_attempts

Stores async Echo Lab pronunciation attempts for queue + worker processing.

Columns:
- id (uuid, PK)
- user_id (text, FK -> users.id)
- subject_key (text)
- status (text) — queued | processing | complete | failed | expired
- word_id (text)
- example_index (integer)
- scope (text, nullable)
- slug (text, nullable)
- audio_object_key (text)
- transcript (text, nullable)
- expected_chinese (text, nullable)
- expected_jyutping (text, nullable)
- score (integer, nullable)
- match_type (text, nullable)
- confidence (numeric, nullable)
- feedback_json (jsonb, nullable)
- error_code (text, nullable)
- error_message (text, nullable)
- idempotency_key (text, nullable, unique per user)
- created_at / queued_at / processing_at / completed_at / failed_at / expired_at (timestamptz)

Indexes:
- (user_id, created_at desc)
- (status, created_at asc)
- (subject_key, created_at desc)
