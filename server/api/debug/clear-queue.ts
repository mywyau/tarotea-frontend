// // server/api/debug/clear-queue.ts
// import { redis } from "~/server/redis"

// export default defineEventHandler(async () => {
//   await redis.del("xp_queue")

//   return { cleared: true }
// })