import { getTaroKeysEarned } from "~/config/unlock/unlock-config";
import { db } from "~/server/repositories/db";

export type UnlockBalance = {
  totalXp: number;
  creditsEarned: number;
  creditsSpent: number;
  creditsAvailable: number;
};

export async function getUserUnlockBalance(
  userId: string,
): Promise<UnlockBalance> {
  const balanceResult = await db.query<{
    total_xp: number | string | null;
    spent: number | string | null;
  }>(
    `
    select
      coalesce((
        select total_xp
        from user_stats
        where user_id = $1
        limit 1
      ), 0) as total_xp,
      coalesce((
        select sum(cost_credits)
        from user_word_unlocks
        where user_id = $1
          and unlock_source = 'xp_credit'
      ), 0)::int as spent
    `,
    [userId],
  );

  const totalXp = Number(balanceResult.rows[0]?.total_xp ?? 0);
  const creditsEarned = getTaroKeysEarned(totalXp);
  const creditsSpent = Number(balanceResult.rows[0]?.spent ?? 0);
  const creditsAvailable = Math.max(0, creditsEarned - creditsSpent);

  return {
    totalXp,
    creditsEarned,
    creditsSpent,
    creditsAvailable,
  };
}
