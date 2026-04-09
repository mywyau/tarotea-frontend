type UnlockWordBody = {
  wordId: string
}

import { createError, readBody } from "h3"
import { db } from "~/server/repositories/db"
import { requireUser } from "~/server/utils/requireUser"
import { getUserUnlockBalance } from "~/server/utils/unlock/getUserUnlockBalance"

type Body = {
  wordId: string
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<Body>(event)

  const wordId = body.wordId?.trim()
  if (!wordId) {
    throw createError({
      statusCode: 400,
      statusMessage: "wordId is required"
    })
  }

  return await db.tx(async (tx) => {
    // optional: verify word exists in your content source first

    const existing = await tx.oneOrNone(
      `
      select 1
      from user_word_unlocks
      where user_id = $1 and word_id = $2
      `,
      [user.id, wordId]
    )

    if (existing) {
      return {
        ok: true,
        alreadyUnlocked: true,
        wordId,
      }
    }

    const stats = await tx.oneOrNone(
      `
      select total_xp
      from user_stats
      where user_id = $1
      `,
      [user.id]
    )

    const totalXp = Number(stats?.total_xp ?? 0)
    const creditsEarned = Math.floor(totalXp / 500)

    const spentRow = await tx.one(
      `
      select coalesce(sum(cost_credits), 0)::int as spent
      from user_word_unlocks
      where user_id = $1
        and unlock_source = 'xp_credit'
      `,
      [user.id]
    )

    const creditsSpent = Number(spentRow.spent ?? 0)
    const creditsAvailable = Math.max(0, creditsEarned - creditsSpent)

    if (creditsAvailable < 1) {
      throw createError({
        statusCode: 403,
        statusMessage: "Not enough unlock credits"
      })
    }

    await tx.none(
      `
      insert into user_word_unlocks (user_id, word_id, unlock_source, cost_credits)
      values ($1, $2, 'xp_credit', 1)
      `,
      [user.id, wordId]
    )

    return {
      ok: true,
      wordId,
      totalXp,
      creditsEarned,
      creditsSpent: creditsSpent + 1,
      creditsAvailable: creditsAvailable - 1,
    }
  })
})