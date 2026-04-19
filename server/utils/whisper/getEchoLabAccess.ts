// server/utils/pronunciation/getEchoLabAccess.ts
import { db } from "~/server/repositories/db"
import { getUserEntitlement } from "~/server/utils/getEntitlement"
import {
  getUnlockedWordCountForUser,
  isWordUnlockedForUser,
} from "~/server/services/cache/wordUnlockCache"
import { FREE_LEVEL_WORD_LIMIT, FREE_LEVELS } from "~/config/level/levels-config"
import { FREE_WORD_LIMIT } from "~/config/topic/topics-config"
import { freeTopics } from "~/utils/topics/permissions"
import { isLevelId, levelIdToNumbers } from "~/utils/levels/levels"

const FREE_MIN_TOTAL_XP = 5000
const FREE_MIN_UNLOCKED_WORDS = 10

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

type EchoLabScope = "level" | "topic"

type EchoLabAccessOptions = {
  wordId?: string
  scope?: EchoLabScope
  slug?: string
}

type IndexData = {
  categories?: Record<string, Array<{ id?: string }>>
}

async function isWordFreePreview(
  wordId: string,
  scope?: EchoLabScope,
  slug?: string,
): Promise<boolean> {
  const trimmedWordId = wordId.trim()

  if (!trimmedWordId || !scope || !slug) {
    return false
  }

  if (scope === "topic") {
    if (freeTopics.has(slug)) {
      return true
    }

    try {
      const topic = await $fetch<IndexData>(`/api/index/topics/${slug}`)
      const ids = Object.values(topic.categories ?? {})
        .flat()
        .map((word) => word.id ?? "")
        .filter(Boolean)

      return ids.slice(0, FREE_WORD_LIMIT).includes(trimmedWordId)
    } catch {
      return false
    }
  }

  if (!isLevelId(slug)) {
    return false
  }

  if (levelIdToNumbers(slug) <= FREE_LEVELS) {
    return true
  }

  try {
    const level = await $fetch<IndexData>(`/api/index/levels/${slug}`)
    const ids = Object.values(level.categories ?? {})
      .flat()
      .map((word) => word.id ?? "")
      .filter(Boolean)

    return ids.slice(0, FREE_LEVEL_WORD_LIMIT).includes(trimmedWordId)
  } catch {
    return false
  }
}

export async function getEchoLabAccess(
  userId: string,
  options: EchoLabAccessOptions = {},
): Promise<EchoLabAccess> {
  const { wordId, scope, slug } = options
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
    ? (await isWordUnlockedForUser(userId, wordId)) ||
      (await isWordFreePreview(wordId, scope, slug))
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
