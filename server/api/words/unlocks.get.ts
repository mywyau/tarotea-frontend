// import { createError, readBody } from "h3"
// import { db } from "~/server/repositories/db"
// import { requireUser } from "~/server/utils/requireUser"

// type Body = {
//   wordId: string
// }

// export default defineEventHandler(async (event) => {
//   const user = await requireUser(event)
//   const body = await readBody<Body>(event)

//   const wordId = body.wordId?.trim()

//   if (!wordId) {
//     throw createError({
//       statusCode: 400,
//       statusMessage: "wordId is required",
//     })
//   }

//   const client = await db.connect()

//   try {
//     await client.query("BEGIN")

//     // Lock per user for this transaction so concurrent unlocks
//     // cannot overspend the same earned credit.
//     await client.query(
//       `select pg_advisory_xact_lock(hashtext($1))`,
//       [user.id]
//     )

//     const existingResult = await client.query<{ exists: number }>(
//       `
//       select 1 as exists
//       from user_word_unlocks
//       where user_id = $1
//         and word_id = $2
//       limit 1
//       `,
//       [user.id, wordId]
//     )

//     if ((existingResult.rowCount ?? 0) > 0) {
//       await client.query("COMMIT")

//       return {
//         ok: true,
//         alreadyUnlocked: true,
//         wordId,
//       }
//     }

//     // Replace this query if your total XP is stored somewhere else.
//     const statsResult = await client.query<{ total_xp: number | null }>(
//       `
//       select total_xp
//       from user_stats
//       where user_id = $1
//       limit 1
//       `,
//       [user.id]
//     )

//     const totalXp = Number(statsResult.rows[0]?.total_xp ?? 0)
//     const creditsEarned = Math.floor(totalXp / 500)

//     const spentResult = await client.query<{ spent: number | null }>(
//       `
//       select coalesce(sum(cost_credits), 0)::int as spent
//       from user_word_unlocks
//       where user_id = $1
//         and unlock_source = 'xp_credit'
//       `,
//       [user.id]
//     )

//     const creditsSpent = Number(spentResult.rows[0]?.spent ?? 0)
//     const creditsAvailable = Math.max(0, creditsEarned - creditsSpent)

//     if (creditsAvailable < 1) {
//       throw createError({
//         statusCode: 403,
//         statusMessage: "Not enough unlock credits",
//       })
//     }

//     const insertResult = await client.query(
//       `
//       insert into user_word_unlocks (
//         user_id,
//         word_id,
//         unlock_source,
//         cost_credits
//       )
//       values ($1, $2, 'xp_credit', 1)
//       on conflict (user_id, word_id) do nothing
//       `,
//       [user.id, wordId]
//     )

//     // Very defensive: with the advisory lock this should not normally happen,
//     // but this keeps the response honest.
//     if ((insertResult.rowCount ?? 0) === 0) {
//       await client.query("COMMIT")

//       return {
//         ok: true,
//         alreadyUnlocked: true,
//         wordId,
//         totalXp,
//         creditsEarned,
//         creditsSpent,
//         creditsAvailable,
//       }
//     }

//     await client.query("COMMIT")

//     return {
//       ok: true,
//       wordId,
//       totalXp,
//       creditsEarned,
//       creditsSpent: creditsSpent + 1,
//       creditsAvailable: creditsAvailable - 1,
//     }
//   } catch (error) {
//     try {
//       await client.query("ROLLBACK")
//     } catch {
//       // ignore rollback failure
//     }
//     throw error
//   } finally {
//     client.release()
//   }
// })