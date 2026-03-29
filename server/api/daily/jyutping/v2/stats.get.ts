// server/api/daily/jyutping/stats.get.ts

import { db } from "~/server/repositories/db";
import { requireUser } from "~/server/utils/requireUser";
import { masteryXp } from "~/utils/xp/helpers";

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event);
  const userId = auth.sub;

  const { rows } = await db.query(
    `
      select
        coalesce(sum(p.xp), 0) as total_xp,
        count(*) filter (where p.xp >= $2) as words_maxed,
        count(*) as words_seen,
        coalesce(sum(p.correct_count), 0) as total_correct,
        coalesce(sum(p.wrong_count), 0) as total_wrong,

        coalesce((
          select sum(delta)
          from (
            select q.total_delta as delta
            from xp_quiz_events q
            where q.user_id = $1
              and q.created_at >= now() - interval '7 days'

            union all

            select j.total_delta as delta
            from xp_jyutping_events j
            where j.user_id = $1
              and j.created_at >= now() - interval '7 days'
          ) combined
        ), 0) as xp_this_week
      from user_word_progress p
      where p.user_id = $1
    `,
    [userId, masteryXp],
  );

  return (
    rows[0] ?? {
      total_xp: 0,
      words_maxed: 0,
      words_seen: 0,
      total_correct: 0,
      total_wrong: 0,
      xp_this_week: 0,
    }
  );
});
