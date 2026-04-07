// import { Receiver } from "@upstash/qstash";
// import { createError, getHeader, readRawBody } from "h3";
// import { SENTENCE_PROGRESS_CACHE_TTL_SECONDS } from "~/config/redis";
// import { db } from "~/server/repositories/db";
// import { redis } from "~/server/repositories/redis";

// type PayloadAnswer = {
//   wordId: string;
//   correct: boolean;
//   delta: number;
// };

// type SentenceAggregate = {
//   wordId: string;
//   sentenceId: string;
//   seenInc: number;
//   correctInc: number;
//   wrongInc: number;
// };

// type WorkerBody = {
//   userId: string;
//   sessionKey: string;
// };

// type StoredEventPayload = {
//   answers?: PayloadAnswer[];
//   sentenceAggregates?: SentenceAggregate[];
// };

// type ExistingEventRow = {
//   id: number | string;
//   mode: string;
//   total_delta: number | string | null;
//   correct_count: number | string | null;
//   total_questions: number | string | null;
//   processed: boolean | null;
//   payload: StoredEventPayload | string | null;
// };

// type SentenceProgressRow = {
//   sentence_id: string;
//   seen_count: number | string | null;
//   last_seen_at: string | null;
// };

// function parseStoredPayload(
//   payload: ExistingEventRow["payload"],
// ): StoredEventPayload {
//   if (!payload) {
//     throw createError({
//       statusCode: 500,
//       statusMessage: "Quiz event payload missing",
//     });
//   }

//   const parsed =
//     typeof payload === "string"
//       ? (JSON.parse(payload) as StoredEventPayload)
//       : payload;

//   return {
//     answers: Array.isArray(parsed.answers) ? parsed.answers : [],
//     sentenceAggregates: Array.isArray(parsed.sentenceAggregates)
//       ? parsed.sentenceAggregates
//       : [],
//   };
// }

// function rollupAnswersByWord(
//   answers: PayloadAnswer[],
//   existingMap: Map<string, { xp: number; streak: number }>,
// ) {
//   const grouped = new Map<string, PayloadAnswer[]>();

//   for (const answer of answers) {
//     const current = grouped.get(answer.wordId) ?? [];
//     current.push(answer);
//     grouped.set(answer.wordId, current);
//   }

//   const rolledUp: Array<{
//     wordId: string;
//     xp: number;
//     streak: number;
//     appliedDelta: number;
//   }> = [];

//   for (const [wordId, wordAnswers] of grouped.entries()) {
//     const existing = existingMap.get(wordId) ?? { xp: 0, streak: 0 };

//     let xp = existing.xp;
//     let streak = existing.streak;
//     let appliedDelta = 0;

//     for (const answer of wordAnswers) {
//       const beforeXp = xp;
//       xp = Math.max(0, xp + answer.delta);
//       appliedDelta += xp - beforeXp;
//       streak = answer.correct ? streak + 1 : 0;
//     }

//     rolledUp.push({
//       wordId,
//       xp,
//       streak,
//       appliedDelta,
//     });
//   }

//   return rolledUp;
// }

// export default defineEventHandler(async (event) => {
//   const config = useRuntimeConfig();

//   const rawBody = await readRawBody(event, "utf8");
//   if (!rawBody) {
//     throw createError({ statusCode: 400, statusMessage: "Missing body" });
//   }

//   const signature = getHeader(event, "upstash-signature");
//   if (!signature) {
//     throw createError({ statusCode: 401, statusMessage: "Missing signature" });
//   }

//   const receiver = new Receiver({
//     currentSigningKey: config.qstashCurrentSigningKey,
//     nextSigningKey: config.qstashNextSigningKey,
//   });

//   const isValid = await receiver.verify({
//     signature,
//     body: rawBody,
//     url: `${config.public.siteUrl}/api/sentences/topics/v3/xp-quiz-sentences`,
//   });

//   if (!isValid) {
//     throw createError({ statusCode: 401, statusMessage: "Invalid signature" });
//   }

//   const body = JSON.parse(rawBody) as WorkerBody;
//   const { userId, sessionKey } = body;

//   if (!userId || !sessionKey) {
//     throw createError({
//       statusCode: 400,
//       statusMessage: "Missing userId or sessionKey",
//     });
//   }

//   const client = await db.connect();

//   let sentenceProgressRows: SentenceProgressRow[] = [];
//   let quizMode = "";
//   let correctCount = 0;
//   let totalQuestions = 0;
//   let xpEarned = 0;
//   let alreadyProcessed = false;

//   try {
//     await client.query("BEGIN");

//     const eventRes = await client.query<ExistingEventRow>(
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
//       for update
//       `,
//       [userId, sessionKey],
//     );

//     if (eventRes.rows.length === 0) {
//       throw createError({
//         statusCode: 404,
//         statusMessage: "Quiz event not found",
//       });
//     }

//     const quizEvent = eventRes.rows[0];

//     if (quizEvent.mode !== "topic-sentences") {
//       throw createError({
//         statusCode: 400,
//         statusMessage: "Invalid topic sentence quiz event, not topic-sentences",
//       });
//     }

//     quizMode = quizEvent.mode;
//     correctCount = Number(quizEvent.correct_count ?? 0);
//     totalQuestions = Number(quizEvent.total_questions ?? 0);
//     xpEarned = Number(quizEvent.total_delta ?? 0);

//     if (quizEvent.processed) {
//       alreadyProcessed = true;
//       await client.query("COMMIT");
//     } else {
//       const storedPayload = parseStoredPayload(quizEvent.payload);
//       const payloadAnswers = storedPayload.answers ?? [];
//       const sentenceAggregates = storedPayload.sentenceAggregates ?? [];

//       if (payloadAnswers.length === 0) {
//         throw createError({
//           statusCode: 500,
//           statusMessage: "Quiz event has no answers payload",
//         });
//       }

//       const uniqueWordIds = [...new Set(payloadAnswers.map((a) => a.wordId))];

//       const existingWordRowsRes = uniqueWordIds.length
//         ? await client.query<{
//             word_id: string;
//             xp: number | string | null;
//             streak: number | string | null;
//           }>(
//             `
//             select word_id, xp, streak
//             from user_word_progress
//             where user_id = $1
//               and word_id = any($2::text[])
//             `,
//             [userId, uniqueWordIds],
//           )
//         : {
//             rows: [] as Array<{
//               word_id: string;
//               xp: number | string | null;
//               streak: number | string | null;
//             }>,
//           };

//       const existingMap = new Map<string, { xp: number; streak: number }>(
//         existingWordRowsRes.rows.map((row) => [
//           row.word_id,
//           {
//             xp: Number(row.xp ?? 0),
//             streak: Number(row.streak ?? 0),
//           },
//         ]),
//       );

//       const rolledUpWordProgress = rollupAnswersByWord(
//         payloadAnswers,
//         existingMap,
//       );

//       const appliedTotalDelta = rolledUpWordProgress.reduce(
//         (sum, row) => sum + row.appliedDelta,
//         0,
//       );

//       if (rolledUpWordProgress.length > 0) {
//         await client.query(
//           `
//           insert into user_word_progress (
//             user_id,
//             word_id,
//             xp,
//             streak,
//             created_at,
//             updated_at
//           )
//           select
//             $1,
//             t.word_id,
//             t.xp,
//             t.streak,
//             now(),
//             now()
//           from unnest(
//             $2::text[],
//             $3::int[],
//             $4::int[]
//           ) as t(word_id, xp, streak)
//           on conflict (user_id, word_id)
//           do update set
//             xp = excluded.xp,
//             streak = excluded.streak,
//             updated_at = now()
//           `,
//           [
//             userId,
//             rolledUpWordProgress.map((r) => r.wordId),
//             rolledUpWordProgress.map((r) => r.xp),
//             rolledUpWordProgress.map((r) => r.streak),
//           ],
//         );
//       }

//       if (sentenceAggregates.length > 0) {
//         const sentenceUpsertRes = await client.query<SentenceProgressRow>(
//           `
//           with aggregated as (
//             select *
//             from unnest(
//               $2::text[],
//               $3::text[],
//               $4::int[],
//               $5::int[],
//               $6::int[]
//             ) as t(word_id, sentence_id, seen_inc, correct_inc, wrong_inc)
//           )
//           insert into user_sentence_progress (
//             user_id,
//             word_id,
//             sentence_id,
//             seen_count,
//             correct_count,
//             wrong_count,
//             last_seen_at,
//             created_at,
//             updated_at
//           )
//           select
//             $1,
//             word_id,
//             sentence_id,
//             seen_inc,
//             correct_inc,
//             wrong_inc,
//             now(),
//             now(),
//             now()
//           from aggregated
//           on conflict (user_id, sentence_id)
//           do update set
//             word_id = excluded.word_id,
//             seen_count = user_sentence_progress.seen_count + excluded.seen_count,
//             correct_count = user_sentence_progress.correct_count + excluded.correct_count,
//             wrong_count = user_sentence_progress.wrong_count + excluded.wrong_count,
//             last_seen_at = now(),
//             updated_at = now()
//           returning sentence_id, seen_count, last_seen_at
//           `,
//           [
//             userId,
//             sentenceAggregates.map((a) => a.wordId),
//             sentenceAggregates.map((a) => a.sentenceId),
//             sentenceAggregates.map((a) => a.seenInc),
//             sentenceAggregates.map((a) => a.correctInc),
//             sentenceAggregates.map((a) => a.wrongInc),
//           ],
//         );

//         sentenceProgressRows = sentenceUpsertRes.rows;
//       }

//       await client.query(
//         `
//           update xp_quiz_events
//           set processed = true,
//               processed_at = now(),
//               applied_total_delta = $2
//           where id = $1
//         `,
//         [quizEvent.id, appliedTotalDelta],
//       );
//       await client.query("COMMIT");
//     }
//   } catch (error) {
//     await client.query("ROLLBACK");
//     throw error;
//   } finally {
//     client.release();
//   }

//   if (!alreadyProcessed && sentenceProgressRows.length > 0) {
//     const redisWrites: Record<string, string> = {};

//     for (const row of sentenceProgressRows) {
//       redisWrites[row.sentence_id] = JSON.stringify({
//         seenCount: Number(row.seen_count ?? 0),
//         lastSeenAt: row.last_seen_at ?? null,
//       });
//     }

//     if (Object.keys(redisWrites).length > 0) {
//       const sentenceProgressKey = `sentence_progress:${userId}`;

//       try {
//         await redis.hset(sentenceProgressKey, redisWrites);
//         await redis.expire(
//           sentenceProgressKey,
//           SENTENCE_PROGRESS_CACHE_TTL_SECONDS,
//         );
//       } catch (error) {
//         console.error("Failed to update sentence progress cache", {
//           userId,
//           sessionKey,
//           error,
//         });
//       }
//     }
//   }

//   await redis
//     .del(`quiz:topic-sentences:${userId}:${sessionKey}`)
//     .catch(() => {});

//   return {
//     quiz: {
//       mode: quizMode,
//       correctCount,
//       totalQuestions,
//       xpEarned,
//     },
//     deduped: alreadyProcessed,
//   };
// });


import { Receiver } from "@upstash/qstash";
import { createError, getHeader, readRawBody } from "h3";
import { SENTENCE_PROGRESS_CACHE_TTL_SECONDS } from "~/config/redis";
import { db } from "~/server/repositories/db";
import { redis } from "~/server/repositories/redis";
import { masteryXp } from "~/utils/xp/helpers";

type PayloadAnswer = {
  wordId: string;
  correct: boolean;
  delta: number;
};

type SentenceAggregate = {
  wordId: string;
  sentenceId: string;
  seenInc: number;
  correctInc: number;
  wrongInc: number;
};

type WorkerBody = {
  userId: string;
  sessionKey: string;
};

type StoredEventPayload = {
  answers?: PayloadAnswer[];
  sentenceAggregates?: SentenceAggregate[];
};

type ExistingEventRow = {
  id: number | string;
  mode: string;
  total_delta: number | string | null;
  applied_total_delta: number | string | null;
  correct_count: number | string | null;
  total_questions: number | string | null;
  processed: boolean | null;
  payload: StoredEventPayload | string | null;
};

type SentenceProgressRow = {
  sentence_id: string;
  seen_count: number | string | null;
  last_seen_at: string | null;
};

type ExistingWordRow = {
  word_id: string;
  xp: number | string | null;
  streak: number | string | null;
};

type RolledUpWordProgress = {
  wordId: string;
  xpBefore: number;
  xpAfter: number;
  streak: number;
  appliedDelta: number;
  existedBefore: boolean;
};

function parseStoredPayload(
  payload: ExistingEventRow["payload"],
): StoredEventPayload {
  if (!payload) {
    throw createError({
      statusCode: 500,
      statusMessage: "Quiz event payload missing",
    });
  }

  const parsed =
    typeof payload === "string"
      ? (JSON.parse(payload) as StoredEventPayload)
      : payload;

  return {
    answers: Array.isArray(parsed.answers) ? parsed.answers : [],
    sentenceAggregates: Array.isArray(parsed.sentenceAggregates)
      ? parsed.sentenceAggregates
      : [],
  };
}

function rollupAnswersByWord(
  answers: PayloadAnswer[],
  existingMap: Map<string, { xp: number; streak: number }>,
): RolledUpWordProgress[] {
  const grouped = new Map<string, PayloadAnswer[]>();

  for (const answer of answers) {
    const current = grouped.get(answer.wordId) ?? [];
    current.push(answer);
    grouped.set(answer.wordId, current);
  }

  const rolledUp: RolledUpWordProgress[] = [];

  for (const [wordId, wordAnswers] of grouped.entries()) {
    const existing = existingMap.get(wordId) ?? { xp: 0, streak: 0 };
    const existedBefore = existingMap.has(wordId);

    const xpBefore = existing.xp;
    let xp = existing.xp;
    let streak = existing.streak;
    let appliedDelta = 0;

    for (const answer of wordAnswers) {
      const beforeXp = xp;
      xp = Math.max(0, xp + answer.delta);
      appliedDelta += xp - beforeXp;
      streak = answer.correct ? streak + 1 : 0;
    }

    rolledUp.push({
      wordId,
      xpBefore,
      xpAfter: xp,
      streak,
      appliedDelta,
      existedBefore,
    });
  }

  return rolledUp;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const rawBody = await readRawBody(event, "utf8");
  if (!rawBody) {
    throw createError({ statusCode: 400, statusMessage: "Missing body" });
  }

  const signature = getHeader(event, "upstash-signature");
  if (!signature) {
    throw createError({ statusCode: 401, statusMessage: "Missing signature" });
  }

  const receiver = new Receiver({
    currentSigningKey: config.qstashCurrentSigningKey,
    nextSigningKey: config.qstashNextSigningKey,
  });

  const isValid = await receiver.verify({
    signature,
    body: rawBody,
    url: `${config.public.siteUrl}/api/sentences/topics/v3/xp-quiz-sentences`,
  });

  if (!isValid) {
    throw createError({ statusCode: 401, statusMessage: "Invalid signature" });
  }

  const body = JSON.parse(rawBody) as WorkerBody;
  const { userId, sessionKey } = body;

  if (!userId || !sessionKey) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing userId or sessionKey",
    });
  }

  const client = await db.connect();

  let sentenceProgressRows: SentenceProgressRow[] = [];
  let quizMode = "";
  let correctCount = 0;
  let totalQuestions = 0;
  let xpEarned = 0;
  let alreadyProcessed = false;

  try {
    await client.query("BEGIN");

    const eventRes = await client.query<ExistingEventRow>(
      `
      select
        id,
        mode,
        total_delta,
        applied_total_delta,
        correct_count,
        total_questions,
        processed,
        payload
      from xp_quiz_events
      where user_id = $1
        and session_key = $2
      limit 1
      for update
      `,
      [userId, sessionKey],
    );

    if (eventRes.rows.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: "Quiz event not found",
      });
    }

    const quizEvent = eventRes.rows[0];

    if (quizEvent.mode !== "topic-sentences") {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid topic sentence quiz event, not topic-sentences",
      });
    }

    quizMode = quizEvent.mode;

    if (quizEvent.processed) {
      alreadyProcessed = true;
      correctCount = Number(quizEvent.correct_count ?? 0);
      totalQuestions = Number(quizEvent.total_questions ?? 0);
      xpEarned = Number(
        quizEvent.applied_total_delta ?? quizEvent.total_delta ?? 0,
      );

      await client.query("COMMIT");
    } else {
      const storedPayload = parseStoredPayload(quizEvent.payload);
      const payloadAnswers = storedPayload.answers ?? [];
      const sentenceAggregates = storedPayload.sentenceAggregates ?? [];

      if (payloadAnswers.length === 0) {
        throw createError({
          statusCode: 500,
          statusMessage: "Quiz event has no answers payload",
        });
      }

      correctCount = Number(
        quizEvent.correct_count ??
          payloadAnswers.filter((answer) => answer.correct).length,
      );
      totalQuestions = Number(quizEvent.total_questions ?? payloadAnswers.length);

      const uniqueWordIds = [...new Set(payloadAnswers.map((a) => a.wordId))];

      const existingWordRowsRes = uniqueWordIds.length
        ? await client.query<ExistingWordRow>(
            `
            select word_id, xp, streak
            from user_word_progress
            where user_id = $1
              and word_id = any($2::text[])
            `,
            [userId, uniqueWordIds],
          )
        : { rows: [] as ExistingWordRow[] };

      const existingMap = new Map<string, { xp: number; streak: number }>(
        existingWordRowsRes.rows.map((row) => [
          row.word_id,
          {
            xp: Number(row.xp ?? 0),
            streak: Number(row.streak ?? 0),
          },
        ]),
      );

      const rolledUpWordProgress = rollupAnswersByWord(
        payloadAnswers,
        existingMap,
      );

      const appliedTotalDelta = rolledUpWordProgress.reduce(
        (sum, row) => sum + row.appliedDelta,
        0,
      );

      const wrongCount = totalQuestions - correctCount;
      const statDate = new Date().toISOString().slice(0, 10);

      const newWordsSeenCount = rolledUpWordProgress.reduce(
        (sum, row) => sum + (row.existedBefore ? 0 : 1),
        0,
      );

      const newWordsMaxedCount = rolledUpWordProgress.reduce((sum, row) => {
        const wasMaxedBefore = row.xpBefore >= masteryXp;
        const isMaxedAfter = row.xpAfter >= masteryXp;
        return sum + (!wasMaxedBefore && isMaxedAfter ? 1 : 0);
      }, 0);

      xpEarned = appliedTotalDelta;

      if (rolledUpWordProgress.length > 0) {
        await client.query(
          `
          insert into user_word_progress (
            user_id,
            word_id,
            xp,
            streak,
            created_at,
            updated_at
          )
          select
            $1,
            t.word_id,
            t.xp,
            t.streak,
            now(),
            now()
          from unnest(
            $2::text[],
            $3::int[],
            $4::int[]
          ) as t(word_id, xp, streak)
          on conflict (user_id, word_id)
          do update set
            xp = excluded.xp,
            streak = excluded.streak,
            updated_at = now()
          `,
          [
            userId,
            rolledUpWordProgress.map((r) => r.wordId),
            rolledUpWordProgress.map((r) => r.xpAfter),
            rolledUpWordProgress.map((r) => r.streak),
          ],
        );
      }

      if (sentenceAggregates.length > 0) {
        const sentenceUpsertRes = await client.query<SentenceProgressRow>(
          `
          with aggregated as (
            select *
            from unnest(
              $2::text[],
              $3::text[],
              $4::int[],
              $5::int[],
              $6::int[]
            ) as t(word_id, sentence_id, seen_inc, correct_inc, wrong_inc)
          )
          insert into user_sentence_progress (
            user_id,
            word_id,
            sentence_id,
            seen_count,
            correct_count,
            wrong_count,
            last_seen_at,
            created_at,
            updated_at
          )
          select
            $1,
            word_id,
            sentence_id,
            seen_inc,
            correct_inc,
            wrong_inc,
            now(),
            now(),
            now()
          from aggregated
          on conflict (user_id, sentence_id)
          do update set
            word_id = excluded.word_id,
            seen_count = user_sentence_progress.seen_count + excluded.seen_count,
            correct_count = user_sentence_progress.correct_count + excluded.correct_count,
            wrong_count = user_sentence_progress.wrong_count + excluded.wrong_count,
            last_seen_at = now(),
            updated_at = now()
          returning sentence_id, seen_count, last_seen_at
          `,
          [
            userId,
            sentenceAggregates.map((a) => a.wordId),
            sentenceAggregates.map((a) => a.sentenceId),
            sentenceAggregates.map((a) => a.seenInc),
            sentenceAggregates.map((a) => a.correctInc),
            sentenceAggregates.map((a) => a.wrongInc),
          ],
        );

        sentenceProgressRows = sentenceUpsertRes.rows;
      }

      await client.query(
        `
        insert into user_stats (
          user_id,
          total_xp,
          words_maxed,
          words_seen,
          total_correct,
          total_wrong,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, now())
        on conflict (user_id)
        do update set
          total_xp = user_stats.total_xp + excluded.total_xp,
          words_maxed = user_stats.words_maxed + excluded.words_maxed,
          words_seen = user_stats.words_seen + excluded.words_seen,
          total_correct = user_stats.total_correct + excluded.total_correct,
          total_wrong = user_stats.total_wrong + excluded.total_wrong,
          updated_at = now()
        `,
        [
          userId,
          appliedTotalDelta,
          newWordsMaxedCount,
          newWordsSeenCount,
          correctCount,
          wrongCount,
        ],
      );

      await client.query(
        `
        insert into user_stats_daily (
          user_id,
          stat_date,
          xp_gained,
          correct_count,
          wrong_count,
          quizzes_completed,
          jyutping_completed,
          created_at,
          updated_at
        )
        values ($1, $2::date, $3, $4, $5, $6, $7, now(), now())
        on conflict (user_id, stat_date)
        do update set
          xp_gained = user_stats_daily.xp_gained + excluded.xp_gained,
          correct_count = user_stats_daily.correct_count + excluded.correct_count,
          wrong_count = user_stats_daily.wrong_count + excluded.wrong_count,
          quizzes_completed = user_stats_daily.quizzes_completed + excluded.quizzes_completed,
          jyutping_completed = user_stats_daily.jyutping_completed + excluded.jyutping_completed,
          updated_at = now()
        `,
        [userId, statDate, appliedTotalDelta, correctCount, wrongCount, 1, 0],
      );

      await client.query(
        `
          update xp_quiz_events
          set processed = true,
              processed_at = now(),
              applied_total_delta = $2
          where id = $1
        `,
        [quizEvent.id, appliedTotalDelta],
      );

      await client.query("COMMIT");
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  if (!alreadyProcessed && sentenceProgressRows.length > 0) {
    const redisWrites: Record<string, string> = {};

    for (const row of sentenceProgressRows) {
      redisWrites[row.sentence_id] = JSON.stringify({
        seenCount: Number(row.seen_count ?? 0),
        lastSeenAt: row.last_seen_at ?? null,
      });
    }

    if (Object.keys(redisWrites).length > 0) {
      const sentenceProgressKey = `sentence_progress:${userId}`;

      try {
        await redis.hset(sentenceProgressKey, redisWrites);
        await redis.expire(
          sentenceProgressKey,
          SENTENCE_PROGRESS_CACHE_TTL_SECONDS,
        );
      } catch (error) {
        console.error("Failed to update sentence progress cache", {
          userId,
          sessionKey,
          error,
        });
      }
    }
  }

  await redis.del(`quiz:topic-sentences:${userId}:${sessionKey}`).catch(() => {});
  await redis.del(`user:stats:v2:${userId}`).catch(() => {});

  return {
    quiz: {
      mode: quizMode,
      correctCount,
      totalQuestions,
      xpEarned,
    },
    deduped: alreadyProcessed,
  };
});