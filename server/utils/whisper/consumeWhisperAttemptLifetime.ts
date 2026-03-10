// import { createError } from "h3";
// import { db } from "~/server/db";

// export async function consumeWhisperAttemptLifetime(
//   userId: string,
//   limit: number,
// ) {
//   const { rows } = await db.query(
//     `
//     INSERT INTO ai_usage_total (user_id, attempts)
//     VALUES ($1, 1)
//     ON CONFLICT (user_id)
//     DO UPDATE SET attempts = ai_usage_total.attempts + 1
//     RETURNING attempts
//     `,
//     [userId],
//   );

//   const attempts = rows[0]?.attempts ?? 0;

//   if (attempts > limit) {
//     throw createError({
//       statusCode: 429,
//       statusMessage: "Free pronunciation limit reached",
//     });
//   }

//   return {
//     attempts,
//     remaining: Math.max(0, limit - attempts),
//     limit,
//   };
// }