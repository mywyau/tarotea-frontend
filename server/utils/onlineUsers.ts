import { redis } from '~/server/repositories/redis'

const ONLINE_WINDOW_MS = 2 * 60 * 1000
const ONLINE_USERS_KEY = 'online_users:sessions'

function getCutoffTimestampMs() {
  return Date.now() - ONLINE_WINDOW_MS
}

async function pruneStaleSessions() {
  await redis.zremrangebyscore(ONLINE_USERS_KEY, 0, getCutoffTimestampMs())
}

export async function touchOnlineSession(sessionId: string) {
  if (!sessionId) {
    return countOnlineUsers()
  }

  await redis.zadd(ONLINE_USERS_KEY, {
    score: Date.now(),
    member: sessionId,
  })

  await pruneStaleSessions()
  return redis.zcard(ONLINE_USERS_KEY)
}

export async function countOnlineUsers() {
  await pruneStaleSessions()
  return redis.zcard(ONLINE_USERS_KEY)
}
