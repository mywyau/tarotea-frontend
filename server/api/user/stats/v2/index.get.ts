import { masteryXp } from "~/config/xp/helpers";
import { getStatsWordCatalogue } from "~/server/services/stats/wordCatalogue";
import { db } from "~/server/repositories/db";
import { getUserEntitlement } from "~/server/utils/getEntitlement";
import { requireUser } from "~/server/utils/requireUser";
import { hasPaidAccess } from "~/utils/paidAccess";

type UserStatsResponse = {
  total_xp: number;
  words_maxed: number;
  words_seen: number;
  words_unlocked: number | null;
  total_words: number | null;
  total_unlockable_words: number | null;
  total_correct: number;
  total_wrong: number;
  xp_this_week: number;
};

export default defineEventHandler(async (event): Promise<UserStatsResponse> => {
  const auth = await requireUser(event);
  const userId = auth.sub;

  const [statsResult, weeklyXpResult, wordProgress, entitlement, catalogue] = await Promise.all([
    db.query(
      `
        select
          total_xp,
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
    db.query(
      `
        select word_id, 'unlocked' as kind
        from user_word_unlocks
        where user_id = $1
        union all
        select word_id, 'maxed' as kind
        from user_word_progress
        where user_id = $1 and xp >= $2
      `,
      [userId, masteryXp]
    ),
    getUserEntitlement(userId),
    getStatsWordCatalogue(useRuntimeConfig().public.cdnBase).catch(error => {
      console.warn("Could not load word totals for stats", error);
      return null;
    }),
  ]);

  const statsRow = statsResult.rows[0];
  const weeklyRow = weeklyXpResult.rows[0];
  const all = catalogue && new Set(catalogue.all);
  const unlockable = catalogue && new Set(catalogue.unlockable);
  const maxed = wordProgress.rows.filter(row => row.kind === "maxed" && (!all || all.has(row.word_id))).length;
  const fullAccess = hasPaidAccess(entitlement);
  const unlockTotal = (fullAccess ? all : unlockable)?.size ?? null;
  const unlocked = fullAccess
    ? unlockTotal
    : wordProgress.rows.filter(row => row.kind === "unlocked" && (!unlockable || unlockable.has(row.word_id))).length;

  return {
    total_xp: Number(statsRow?.total_xp ?? 0),
    words_maxed: maxed,
    words_seen: Number(statsRow?.words_seen ?? 0),
    words_unlocked: unlocked,
    total_words: all?.size ?? null,
    total_unlockable_words: unlockTotal,
    total_correct: Number(statsRow?.total_correct ?? 0),
    total_wrong: Number(statsRow?.total_wrong ?? 0),
    xp_this_week: Number(weeklyRow?.xp_this_week ?? 0),
  };
});
