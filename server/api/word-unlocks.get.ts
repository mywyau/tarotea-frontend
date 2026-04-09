import { getQuery } from "h3"
import { db } from "~/server/repositories/db"
import { requireUser } from "~/server/utils/requireUser"

export default defineEventHandler(async (event) => {

  const user = await requireUser(event)
  const query = getQuery(event)

  const wordIds = String(query.wordIds ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)

  const statsResult = await db.query<{ total_xp: number | null }>(
    `
    select total_xp
    from user_stats
    where user_id = $1
    limit 1
    `,
    [user.sub]
  )

  const totalXp = Number(statsResult.rows[0]?.total_xp ?? 0)
  const creditsEarned = Math.floor(totalXp / 500)

  const spentResult = await db.query<{ spent: number | null }>(
    `
    select coalesce(sum(cost_credits), 0)::int as spent
    from user_word_unlocks
    where user_id = $1
      and unlock_source = 'xp_credit'
    `,
    [user.sub]
  )

  const creditsSpent = Number(spentResult.rows[0]?.spent ?? 0)
  const creditsAvailable = Math.max(0, creditsEarned - creditsSpent)

  let unlockedWordIds: string[] = []

  if (wordIds.length > 0) {
    const unlocksResult = await db.query<{ word_id: string }>(
      `
      select word_id
      from user_word_unlocks
      where user_id = $1
        and word_id = any($2::text[])
      `,
      [user.sub, wordIds]
    )

    unlockedWordIds = unlocksResult.rows.map((row) => row.word_id)
  }

  return {
    totalXp,
    creditsEarned,
    creditsSpent,
    creditsAvailable,
    unlockedWordIds,
  }
})