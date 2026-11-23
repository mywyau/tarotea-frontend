alter table xp_quiz_events add column vocab_last_recovery_at timestamptz;

create index xp_quiz_events_vocab_recovery_idx
  on xp_quiz_events (coalesce(vocab_last_recovery_at, created_at), id)
  where not processed and attempt_id is not null
    and mode in ('grind-level', 'grind-level-audio', 'grind-topic', 'grind-topic-audio');
