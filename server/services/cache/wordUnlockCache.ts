import { db } from "~/server/repositories/db"
import { redis } from "~/server/repositories/redis"

const UNLOCK_KEY_PREFIX = "word-unlocks:v1:user"

export function unlockSetKey(userId: string) {
  return `${UNLOCK_KEY_PREFIX}:${userId}`
}

export function unlockHydratedKey(userId: string) {
  return `${UNLOCK_KEY_PREFIX}:${userId}:hydrated`
}

export async function ensureWordUnlocksHydrated(userId: string) {
  const hydrated = await redis.get(unlockHydratedKey(userId))

  if (hydrated) {
    return
  }

  const result = await db.query<{ word_id: string }>(
    `
    select word_id
    from user_word_unlocks
    where user_id = $1
    `,
    [userId]
  )

  const wordIds = Array.from(
    new Set(
      result.rows
        .map((row) => row.word_id?.trim())
        .filter((wordId): wordId is string => Boolean(wordId))
    )
  )

  if (wordIds.length > 0) {
    await redis.sadd(unlockSetKey(userId), ...wordIds)
  }

  // No TTL: unlocks are permanent.
  await redis.set(unlockHydratedKey(userId), "1")
}

export async function addWordUnlockToCache(userId: string, wordId: string) {
  const trimmedWordId = wordId.trim()

  if (!trimmedWordId) return

  await redis.sadd(unlockSetKey(userId), trimmedWordId)
  await redis.set(unlockHydratedKey(userId), "1")
}

export async function isWordUnlockedForUser(userId: string, wordId: string) {
  const trimmedWordId = wordId.trim()

  if (!trimmedWordId) return false

  await ensureWordUnlocksHydrated(userId)

  const result = await redis.sismember(unlockSetKey(userId), trimmedWordId)
  return Boolean(result)
}

export async function getUnlockedWordIdsForUser(
  userId: string,
  wordIds: string[]
) {
  const trimmedWordIds = Array.from(
    new Set(wordIds.map((wordId) => wordId.trim()).filter(Boolean))
  )

  if (trimmedWordIds.length === 0) {
    return []
  }

  await ensureWordUnlocksHydrated(userId)

  const membership = await Promise.all(
    trimmedWordIds.map((wordId) =>
      redis.sismember(unlockSetKey(userId), wordId)
    )
  )

  return trimmedWordIds.filter((_, index) => Boolean(membership[index]))
}