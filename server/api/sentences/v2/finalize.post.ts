// import { Client } from "@upstash/qstash";
// import { createError, readBody } from "h3";
// import { db } from "~/server/repositories/db";
// import { redis } from "~/server/repositories/redis";
// import { aggregateSentenceAnswers } from "~/server/services/sentence-quiz/finalize/aggregateSentenceAnswers";
// import { buildPayloadAnswers } from "~/server/services/sentence-quiz/finalize/buildPayloadAnswers";
// import { buildWordOutcomeMap } from "~/server/services/sentence-quiz/finalize/buildWordOutcomeMap";
// import { normalizeAndValidateAnswers } from "~/server/services/sentence-quiz/finalize/normalizeAndValidateAnswers";
// import type {
//   FinalizeBody,
//   QuizSession,
// } from "~/server/services/sentence-quiz/finalize/type";
// import { requireUser } from "~/server/utils/requireUser";

// type ExistingEventRow = {
//   id: number | string;
//   mode: string;
//   total_delta: number | string | null;
//   correct_count: number | string | null;
//   total_questions: number | string | null;
//   processed: boolean | null;
//   payload: {
//     answers?: Array<{ wordId: string; correct: boolean; delta: number }>;
//     sentenceAggregates?: Array<{
//       wordId: string;
//       sentenceId: string;
//       seenInc: number;
//       correctInc: number;
//       wrongInc: number;
//     }>;
//   } | null;
// };

// async function publishSentenceWorker(args: {
//   userId: string;
//   sessionKey: string;
// }) {
//   const config = useRuntimeConfig();
//   const qstash = new Client({
//     token: config.qstashToken,
//   });

//   await qstash.publishJSON({
//     url: `${config.public.siteUrl}/api/sentences/v2/xp-quiz-sentences`,
//     body: {
//       userId: args.userId,
//       sessionKey: args.sessionKey,
//     },
//     retries: 3,
//     flowControl: {
//       key: "xp-quiz-sentences",
//       parallelism: 20,
//     },
//   });
// }

// export default defineEventHandler(async (event) => {
//   const auth = await requireUser(event);
//   const userId = auth.sub;
//   const body = (await readBody(event)) as FinalizeBody;

//   if (!body?.sessionKey) {
//     throw createError({
//       statusCode: 400,
//       statusMessage: "Missing sessionKey",
//     });
//   }

//   const sessionKey = body.sessionKey;

//   const existingEventRes = await db.query<ExistingEventRow>(
//     `
//     select
//       id,
//       mode,
//       total_delta,
//       correct_count,
//       total_questions,
//       processed,
//       payload
//     from xp_quiz_events
//     where user_id = $1
//       and session_key = $2
//     limit 1
//     `,
//     [userId, sessionKey],
//   );

//   if (existingEventRes.rows.length > 0) {
//     const existing = existingEventRes.rows[0];

//     if (existing.processed) {
//       return {
//         quiz: {
//           mode: existing.mode,
//           correctCount: Number(existing.correct_count ?? 0),
//           totalQuestions: Number(existing.total_questions ?? 0),
//           xpEarned: Number(existing.total_delta ?? 0),
//         },
//         deduped: true,
//       };
//     }

//     await publishSentenceWorker({
//       userId,
//       sessionKey,
//     });

//     return {
//       quiz: {
//         mode: existing.mode,
//         correctCount: Number(existing.correct_count ?? 0),
//         totalQuestions: Number(existing.total_questions ?? 0),
//         xpEarned: Number(existing.total_delta ?? 0),
//       },
//       queued: true,
//       deduped: true,
//     };
//   }

//   const redisKey = `quiz:sentences:${userId}:${sessionKey}`;
//   const rawSession = await redis.get<QuizSession | string>(redisKey);

//   if (!rawSession) {
//     throw createError({
//       statusCode: 410,
//       statusMessage: "Quiz session expired",
//     });
//   }

//   let session: QuizSession;

//   try {
//     session =
//       typeof rawSession === "string"
//         ? (JSON.parse(rawSession) as QuizSession)
//         : (rawSession as QuizSession);
//   } catch {
//     throw createError({
//       statusCode: 500,
//       statusMessage: "Invalid quiz session",
//     });
//   }

//   const mode = session.mode;

//   const allowedPairs = new Set(
//     session.allowedPairs.map((pair) => `${pair.wordId}:${pair.sentenceId}`),
//   );

//   const normalizedAnswers = normalizeAndValidateAnswers(
//     body.answers,
//     allowedPairs,
//   );

//   if (normalizedAnswers.length === 0) {
//     throw createError({
//       statusCode: 400,
//       statusMessage: "No answers",
//     });
//   }

//   const wordOutcomeMap = buildWordOutcomeMap(normalizedAnswers);
//   const sentenceAggregates = aggregateSentenceAnswers(normalizedAnswers);

//   const streakMap = new Map<string, number>();

//   const streakRes = await db.query(
//     `
//     select word_id, streak
//     from user_word_progress
//     where user_id = $1
//       and word_id = any($2::text[])
//     `,
//     [userId, [...wordOutcomeMap.keys()]],
//   );

//   for (const row of streakRes.rows) {
//     streakMap.set(row.word_id, Number(row.streak ?? 0));
//   }

//   const payloadAnswers = buildPayloadAnswers(
//     mode,
//     normalizedAnswers,
//     streakMap,
//   );

//   const correctCount = payloadAnswers.filter((a) => a.correct).length;
//   const totalDelta = payloadAnswers.reduce((acc, a) => acc + a.delta, 0);

//   const insertRes = await db.query<{ id: number | string }>(
//     `
//     insert into xp_quiz_events (
//       user_id,
//       mode,
//       session_key,
//       payload,
//       total_delta,
//       correct_count,
//       total_questions,
//       processed
//     )
//     values (
//       $1,
//       $2,
//       $3,
//       $4::jsonb,
//       $5,
//       $6,
//       $7,
//       false
//     )
//     on conflict (user_id, session_key) do nothing
//     returning id
//     `,
//     [
//       userId,
//       mode,
//       sessionKey,
//       JSON.stringify({
//         answers: payloadAnswers,
//         sentenceAggregates,
//       }),
//       totalDelta,
//       correctCount,
//       payloadAnswers.length,
//     ],
//   );

//   if (insertRes.rows.length === 0) {
//     const racedEventRes = await db.query<ExistingEventRow>(
//       `
//       select
//         id,
//         mode,
//         total_delta,
//         correct_count,
//         total_questions,
//         processed,
//         payload
//       from xp_quiz_events
//       where user_id = $1
//         and session_key = $2
//       limit 1
//       `,
//       [userId, sessionKey],
//     );

//     if (racedEventRes.rows.length === 0) {
//       throw createError({
//         statusCode: 500,
//         statusMessage: "Could not load queued quiz event",
//       });
//     }

//     const existing = racedEventRes.rows[0];

//     if (!existing.processed) {
//       await publishSentenceWorker({
//         userId,
//         sessionKey,
//       });
//     }

//     return {
//       quiz: {
//         mode: existing.mode,
//         correctCount: Number(existing.correct_count ?? 0),
//         totalQuestions: Number(existing.total_questions ?? 0),
//         xpEarned: Number(existing.total_delta ?? 0),
//       },
//       queued: !existing.processed,
//       deduped: true,
//     };
//   }

//   await publishSentenceWorker({
//     userId,
//     sessionKey,
//   });

//   return {
//     quiz: {
//       mode,
//       correctCount,
//       totalQuestions: payloadAnswers.length,
//       xpEarned: totalDelta,
//     },
//     queued: true,
//   };
// });
