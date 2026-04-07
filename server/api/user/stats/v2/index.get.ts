import { db } from "~/server/repositories/db";
import { requireUser } from "~/server/utils/requireUser";

type UserStatsResponse = {
  total_xp: number;
  words_maxed: number;
  words_seen: number;
  total_correct: number;
  total_wrong: number;
  xp_this_week: number;
};

export default defineEventHandler(async (event): Promise<UserStatsResponse> => {
  const auth = await requireUser(event);
  const userId = auth.sub;

  const [statsResult, weeklyXpResult] = await Promise.all([
    db.query(
      `
        select
          total_xp,
          words_maxed,
          words_seen,
          total_correct,
          total_wrong
        from user_stats
        where user_id = $1
        limit 1
      `,
      [userId]
    ),
    db.query(
      `
        select coalesce(sum(xp_gained), 0) as xp_this_week
        from user_stats_daily
        where user_id = $1
          and stat_date >= current_date - 6
      `,
      [userId]
    ),
  ]);

  const statsRow = statsResult.rows[0];
  const weeklyRow = weeklyXpResult.rows[0];

  return {
    total_xp: Number(statsRow?.total_xp ?? 0),
    words_maxed: Number(statsRow?.words_maxed ?? 0),
    words_seen: Number(statsRow?.words_seen ?? 0),
    total_correct: Number(statsRow?.total_correct ?? 0),
    total_wrong: Number(statsRow?.total_wrong ?? 0),
    xp_this_week: Number(weeklyRow?.xp_this_week ?? 0),
  };
});