// // server/api/debug/redis.get.ts
// import { redis } from "~/server/repositories/redis";

// export default defineEventHandler(async () => {
//   const key = "debug:redis:test";

//   await redis.set(key, {
//     ok: true,
//     message: "Upstash is working",
//     at: new Date().toISOString(),
//   });

//   const value = await redis.get(key);

//   return {
//     success: true,
//     key,
//     value,
//   };
// });