import { redis } from "~/server/redis"

export default defineEventHandler(async () => {
  await redis.lpush("xp_queue", "event-1")
  const length = await redis.llen("xp_queue")

  return { queueLength: length }
})