// server/utils/pronunciation/getEchoLabAccess.ts
import { db } from "~/server/repositories/db"
import { getUserEntitlement } from "~/server/utils/getEntitlement"
import {
  getUnlockedWordCountForUser,
  isWordUnlockedForUser,
} from "~/server/services/cache/wordUnlockCache"

const FREE_MIN_TOTAL_XP = 120
const FREE_MIN_UNLOCKED_WORDS = 5

type EchoLabAccess = {
  allowed: boolean
  isPaid: boolean
  reason: "ok" | "needs_more_xp" | "needs_more_unlocks" | "word_locked"
  totalXp: number
  unlockedWordCount: number
  minXp: number
  minUnlockedWords: number
  wordUnlocked: boolean
}

export async function getEchoLabAccess(
  userId: string,
  wordId?: string,
): Promise<EchoLabAccess> {
  const entitlement = await getUserEntitlement(userId)

  const isPaid =
    !!entitlement &&
    entitlement.subscription_status === "active" &&
    ["monthly", "yearly"].includes(entitlement.plan)

  if (isPaid) {
    return {
      allowed: true,
      isPaid: true,
      reason: "ok",
      totalXp: 0,
      unlockedWordCount: 0,
      minXp: FREE_MIN_TOTAL_XP,
      minUnlockedWords: FREE_MIN_UNLOCKED_WORDS,
      wordUnlocked: true,
    }
  }

  const statsResult = await db.query(
    `
      select coalesce(total_xp, 0) as total_xp
      from user_stats
      where user_id = $1
      limit 1
    `,
    [userId],
  )

  const totalXp = Number(statsResult.rows[0]?.total_xp ?? 0)

  const unlockedWordCount = await getUnlockedWordCountForUser(userId)
  const wordUnlocked = wordId
    ? await isWordUnlockedForUser(userId, wordId)
    : true

  const meetsXpGate = totalXp >= FREE_MIN_TOTAL_XP
  const meetsUnlockGate = unlockedWordCount >= FREE_MIN_UNLOCKED_WORDS

  if (!meetsXpGate) {
    return {
      allowed: false,
      isPaid: false,
      reason: "needs_more_xp",
      totalXp,
      unlockedWordCount,
      minXp: FREE_MIN_TOTAL_XP,
      minUnlockedWords: FREE_MIN_UNLOCKED_WORDS,
      wordUnlocked,
    }
  }

  if (!meetsUnlockGate) {
    return {
      allowed: false,
      isPaid: false,
      reason: "needs_more_unlocks",
      totalXp,
      unlockedWordCount,
      minXp: FREE_MIN_TOTAL_XP,
      minUnlockedWords: FREE_MIN_UNLOCKED_WORDS,
      wordUnlocked,
    }
  }

  if (!wordUnlocked) {
    return {
      allowed: false,
      isPaid: false,
      reason: "word_locked",
      totalXp,
      unlockedWordCount,
      minXp: FREE_MIN_TOTAL_XP,
      minUnlockedWords: FREE_MIN_UNLOCKED_WORDS,
      wordUnlocked,
    }
  }

  return {
    allowed: true,
    isPaid: false,
    reason: "ok",
    totalXp,
    unlockedWordCount,
    minXp: FREE_MIN_TOTAL_XP,
    minUnlockedWords: FREE_MIN_UNLOCKED_WORDS,
    wordUnlocked,
  }
}