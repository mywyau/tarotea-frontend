import { redis } from "~/server/redis"

export default defineEventHandler(async () => {
  // await redis.lpush("xp_queue", "test-event")
  await redis.lpush("xp_queue", "1")
  return { queued: true }
})