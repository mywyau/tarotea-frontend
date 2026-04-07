// import { createError, getHeader, readBody } from "h3";
// import { db } from "~/server/repositories/db";
// import { requireUser } from "~/server/utils/requireUser";
// import {
//   chineseOnlySentenceHintXp,
//   chineseOnlySentenceXp,
// } from "~/utils/xp/helpers";

// type SentenceBatchAttempt = {
//   sentenceId: string;
//   sourceWordId: string;
//   passed: boolean;
//   hintUsed: boolean;
// };

// export default defineEventHandler(async (event) => {
//   const auth = await requireUser(event);
//   const userId = auth.sub;

//   const body = (await readBody(event)) as {
//     level: string;
//     sessionKey: string;
//     attempts: SentenceBatchAttempt[];
//   };

//   if (!body || !Array.isArray(body.attempts)) {
//     throw createError({ statusCode: 400, statusMessage: "Invalid payload" });
//   }

//   // de-dupe by sentenceId
//   const map = new Map<string, SentenceBatchAttempt>();

//   for (const a of body.attempts) {
//     if (!a?.sentenceId || !a?.sourceWordId) continue;

//     if (!map.has(a.sentenceId)) {
//       map.set(a.sentenceId, {
//         sentenceId: a.sentenceId,
//         sourceWordId: a.sourceWordId,
//         passed: !!a.passed,
//         hintUsed: !!a.hintUsed,
//       });
//     }
//   }

//   const attempts = [...map.values()];

//   if (attempts.length === 0) {
//     throw createError({ statusCode: 400, statusMessage: "No attempts" });
//   }

//   function deltaFor(a: SentenceBatchAttempt) {
//     if (!a.passed) return 0;
//     return a.hintUsed ? chineseOnlySentenceHintXp : chineseOnlySentenceXp;
//   }

//   const payloadAttempts = attempts.map((a) => ({
//     sentenceId: a.sentenceId,
//     wordId: a.sourceWordId,
//     passed: a.passed,
//     hintUsed: a.hintUsed,
//     delta: deltaFor(a),
//   }));

//   const correctCount = payloadAttempts.filter((a) => a.passed).length;
//   const totalDelta = payloadAttempts.reduce((acc, a) => acc + a.delta, 0);

//   const client = await db.connect();
//   await client.query("BEGIN");

//   try {
//     await client.query(
//       `
//       insert into xp_jyutping_events
//         (
//           user_id,
//           mode,
//           level,
//           session_key,
//           payload,
//           total_delta,
//           correct_count,
//           total_questions
//         )
//       values
//         ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
//       `,
//       [
//         userId,
//         "grind-chinese-sentences-level",
//         body.level,
//         body.sessionKey,
//         JSON.stringify({ answers: payloadAttempts }),
//         totalDelta,
//         correctCount,
//         payloadAttempts.length,
//       ],
//     );

//     await client.query("COMMIT");

//     const host =
//       getHeader(event, "x-forwarded-host") ?? getHeader(event, "host");
//     const proto = getHeader(event, "x-forwarded-proto") ?? "https";

//     if (host) {
//       fetch(`${proto}://${host}/api/worker/xp-jyutping`, {
//         method: "POST",
//       }).catch(() => {});
//     }

//     return {
//       session: {
//         xpEarned: totalDelta,
//         correctCount,
//         totalSentences: payloadAttempts.length,
//       },
//     };
//   } catch (e) {
//     await client.query("ROLLBACK");
//     throw e;
//   } finally {
//     client.release();
//   }
// });
