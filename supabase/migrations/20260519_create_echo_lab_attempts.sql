-- Echo Lab async processing table
-- Created: 2026-05-19

create table if not exists public.echo_lab_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  subject_key text not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'complete', 'failed', 'expired')),

  word_id text not null,
  example_index integer not null check (example_index >= 0),
  scope text,
  slug text,

  audio_object_key text not null,

  transcript text,
  expected_chinese text,
  expected_jyutping text,
  score integer,
  match_type text,
  confidence numeric,
  feedback_json jsonb,

  error_code text,
  error_message text,

  idempotency_key text,

  created_at timestamptz not null default now(),
  queued_at timestamptz not null default now(),
  processing_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  expired_at timestamptz,

  constraint echo_lab_attempts_idempotency_unique unique (user_id, idempotency_key)
);

create index if not exists idx_echo_lab_attempts_user_created
  on public.echo_lab_attempts (user_id, created_at desc);

create index if not exists idx_echo_lab_attempts_status_created
  on public.echo_lab_attempts (status, created_at asc);

create index if not exists idx_echo_lab_attempts_subject_created
  on public.echo_lab_attempts (subject_key, created_at desc);

comment on table public.echo_lab_attempts is
  'Stores async Echo Lab pronunciation attempts and worker results.';
