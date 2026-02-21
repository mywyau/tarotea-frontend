import { db } from "~/server/db";
import { requireUser } from "~/server/utils/requireUser";

export default defineEventHandler(async (event) => {
  const userId = await requireUser(event);

  const { rows } = await db.query(`
    select
      -- Lifetime stats
      coalesce(sum(p.xp), 0) as total_xp,
      count(*) filter (where p.xp >= 200) as words_maxed,
      count(*) as words_seen,
      coalesce(sum(p.correct_count), 0) as total_correct,
      coalesce(sum(p.wrong_count), 0) as total_wrong,

      -- XP gained this week
      coalesce((
        select sum(e.delta)
        from xp_events e
        where e.user_id = $1
          and e.created_at >= now() - interval '7 days'
      ), 0) as xp_this_week

    from user_word_progress p
    where p.user_id = $1
  `, [userId]);

  return rows[0];
});