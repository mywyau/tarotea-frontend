import { db } from "~/server/repositories/db";
import { masteryXp } from "@/config/xp/helpers";

export async function refreshUserStats(userId: string) {
  await db.query(
    `
      insert into user_stats (
        user_id,
        total_xp,
        words_maxed,
        words_seen,
        total_correct,
        total_wrong,
        updated_at
      )
      select
        p.user_id,
        coalesce(sum(p.xp), 0) as total_xp,
        count(*) filter (where p.xp >= $2) as words_maxed,
        count(*) as words_seen,
        coalesce(sum(p.correct_count), 0) as total_correct,
        coalesce(sum(p.wrong_count), 0) as total_wrong,
        now() as updated_at
      from user_word_progress p
      where p.user_id = $1
      group by p.user_id
      on conflict (user_id) do update
      set
        total_xp = excluded.total_xp,
        words_maxed = excluded.words_maxed,
        words_seen = excluded.words_seen,
        total_correct = excluded.total_correct,
        total_wrong = excluded.total_wrong,
        updated_at = now()
    `,
    [userId, masteryXp],
  );

  await db.query(
    `
      insert into user_stats (
        user_id,
        updated_at
      )
      values ($1, now())
      on conflict (user_id) do nothing
    `,
    [userId],
  );
}
