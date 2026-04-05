import { Receiver } from "@upstash/qstash";
import { createError, getHeader, readRawBody } from "h3";
import { db } from "~/server/repositories/db";
import { redis } from "~/server/repositories/redis";
import { masteryXp } from "~/utils/xp/helpers";

type WorkerBody = {
  userId: string;
  sessionKey: string;
};

type DojoMode = "dojo-level-sentences-chinese" | "dojo-topic-sentences-chinese";

type PayloadAnswer = {
  sentenceId?: string;
  wordId: string;
  correct: boolean;
  delta: number;
};

type StoredEventPayload = {
  answers?: PayloadAnswer[];
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

function getSessionRedisKey(userId: string, sessionKey: string) {
  return `dojo:sentence:${userId}:${sessionKey}`;
}

function isDojoMode(mode: string): mode is DojoMode {
  return (
    mode === "dojo-level-sentences-chinese" ||
    mode === "dojo-topic-sentences-chinese"
  );
}

function parseStoredPayload(
  payload: ExistingEventRow["payload"],
): StoredEventPayload {
  if (!payload) {
    throw createError({
      statusCode: 500,
      statusMessage: "Sentence dojo event payload missing",
    });
  }

  const parsed =
    typeof payload === "string"
      ? (JSON.parse(payload) as StoredEventPayload)
      : payload;

  return {
    answers: Array.isArray(parsed.answers) ? parsed.answers : [],
  };
}

function rollupAnswersByWord(
  answers: PayloadAnswer[],
  existingMap: Map<string, { xp: number; streak: number }>,
) {
  const grouped = new Map<string, PayloadAnswer[]>();

  for (const answer of answers) {
    const current = grouped.get(answer.wordId) ?? [];
    current.push(answer);
    grouped.set(answer.wordId, current);
  }

  const rolledUp: Array<{
    wordId: string;
    xp: number;
    streak: number;
    correctInc: number;
    wrongInc: number;
    appliedDelta: number;
  }> = [];

  for (const [wordId, wordAnswers] of grouped.entries()) {
    const existing = existingMap.get(wordId) ?? { xp: 0, streak: 0 };

    let xp = existing.xp;
    let streak = existing.streak;
    let correctInc = 0;
    let wrongInc = 0;
    let appliedDelta = 0;

    for (const answer of wordAnswers) {
      const beforeXp = xp;
      xp = Math.min(masteryXp, Math.max(0, xp + answer.delta));
      appliedDelta += xp - beforeXp;

      if (answer.correct) {
        streak += 1;
        correctInc += 1;
      } else {
        streak = 0;
        wrongInc += 1;
      }
    }

    rolledUp.push({
      wordId,
      xp,
      streak,
      correctInc,
      wrongInc,
      appliedDelta,
    });
  }

  rolledUp.sort((a, b) => a.wordId.localeCompare(b.wordId));
  return rolledUp;
}

function nowMs() {
  return performance.now();
}

async function timedStep<T>(
  timings: Record<string, number>,
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = nowMs();
  try {
    return await fn();
  } finally {
    timings[label] = Math.round(nowMs() - start);
  }
}

function logSummary(details: Record<string, unknown>) {
  console.info("[dojo-sentence-worker]", JSON.stringify(details));
}

export default defineEventHandler(async (event) => {
  const requestStart = nowMs();
  const timings: Record<string, number> = {};

  const config = useRuntimeConfig();

  const rawBody = await timedStep(timings, "readBodyMs", async () => {
    return readRawBody(event, "utf8");
  });

  if (!rawBody) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing body",
    });
  }

  const signature = getHeader(event, "upstash-signature");
  if (!signature) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing signature",
    });
  }

  const receiver = new Receiver({
    currentSigningKey: config.qstashCurrentSigningKey,
    nextSigningKey: config.qstashNextSigningKey,
  });

  const isValid = await timedStep(timings, "verifyMs", async () => {
    return receiver.verify({
      signature,
      body: rawBody,
      url: `${config.public.siteUrl}/api/typing/sentences/v2/xp-chinese`,
    });
  });

  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid signature",
    });
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

  let sessionStats = {
    xpEarned: 0,
    correctCount: 0,
    totalSentences: 0,
  };
  let alreadyProcessed = false;

  try {
    await timedStep(timings, "beginMs", async () => {
      await client.query("BEGIN");
    });

    await timedStep(timings, "userLockMs", async () => {
      await client.query(`select pg_advisory_xact_lock(hashtext($1))`, [
        userId,
      ]);
    });

    const eventRes = await timedStep(timings, "eventLookupMs", async () => {
      return client.query<ExistingEventRow>(
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
        from xp_jyutping_events
        where user_id = $1
          and session_key = $2
        limit 1
        for update
        `,
        [userId, sessionKey],
      );
    });

    if (eventRes.rows.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: "Sentence dojo event not found",
      });
    }

    const quizEvent = eventRes.rows[0];

    if (!isDojoMode(quizEvent.mode)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid sentence dojo event",
      });
    }

    sessionStats = {
      xpEarned: Number(quizEvent.total_delta ?? 0),
      correctCount: Number(quizEvent.correct_count ?? 0),
      totalSentences: Number(quizEvent.total_questions ?? 0),
    };

    if (quizEvent.processed) {
      alreadyProcessed = true;

      await timedStep(timings, "commitMs", async () => {
        await client.query("COMMIT");
      });
    } else {
      const storedPayload = parseStoredPayload(quizEvent.payload);
      const payloadAnswers = storedPayload.answers ?? [];

      if (payloadAnswers.length === 0) {
        throw createError({
          statusCode: 500,
          statusMessage: "Sentence dojo event has no answers payload",
        });
      }

      const uniqueWordIds = [
        ...new Set(payloadAnswers.map((a) => a.wordId)),
      ].sort();

      const existingWordRowsRes = uniqueWordIds.length
        ? await timedStep(timings, "existingProgressReadMs", async () => {
            return client.query<{
              word_id: string;
              xp: number | string | null;
              streak: number | string | null;
            }>(
              `
              select word_id, xp, streak
              from user_word_progress
              where user_id = $1
                and word_id = any($2::text[])
              order by word_id
              `,
              [userId, uniqueWordIds],
            );
          })
        : {
            rows: [] as Array<{
              word_id: string;
              xp: number | string | null;
              streak: number | string | null;
            }>,
          };

      if (uniqueWordIds.length > 0) {
        await timedStep(timings, "progressRowLockMs", async () => {
          await client.query(
            `
            select word_id
            from user_word_progress
            where user_id = $1
              and word_id = any($2::text[])
            order by word_id
            for update
            `,
            [userId, uniqueWordIds],
          );
        });
      }

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

      if (rolledUpWordProgress.length > 0) {
        await timedStep(timings, "progressUpsertMs", async () => {
          await client.query(
            `
            insert into user_word_progress (
              user_id,
              word_id,
              xp,
              streak,
              correct_count,
              wrong_count,
              last_seen_at,
              last_correct_at,
              created_at,
              updated_at
            )
            select
              $1,
              t.word_id,
              t.xp,
              t.streak,
              t.correct_inc,
              t.wrong_inc,
              now(),
              case when t.correct_inc > 0 then now() else null end,
              now(),
              now()
            from unnest(
              $2::text[],
              $3::int[],
              $4::int[],
              $5::int[],
              $6::int[]
            ) as t(word_id, xp, streak, correct_inc, wrong_inc)
            on conflict (user_id, word_id)
            do update set
              xp = excluded.xp,
              streak = excluded.streak,
              correct_count = coalesce(user_word_progress.correct_count, 0) + excluded.correct_count,
              wrong_count = coalesce(user_word_progress.wrong_count, 0) + excluded.wrong_count,
              last_seen_at = now(),
              last_correct_at = case
                when excluded.correct_count > 0 then now()
                else user_word_progress.last_correct_at
              end,
              updated_at = now()
            `,
            [
              userId,
              rolledUpWordProgress.map((r) => r.wordId),
              rolledUpWordProgress.map((r) => r.xp),
              rolledUpWordProgress.map((r) => r.streak),
              rolledUpWordProgress.map((r) => r.correctInc),
              rolledUpWordProgress.map((r) => r.wrongInc),
            ],
          );
        });
      }

      await timedStep(timings, "eventUpdateMs", async () => {
        await client.query(
          `
            update xp_jyutping_events
            set processed = true,
                processed_at = now(),
                applied_total_delta = $2
            where id = $1
          `,
          [quizEvent.id, appliedTotalDelta],
        );
      });

      await timedStep(timings, "commitMs", async () => {
        await client.query("COMMIT");
      });
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  await redis.del(getSessionRedisKey(userId, sessionKey)).catch(() => {});

  logSummary({
    userId,
    sessionKey,
    deduped: alreadyProcessed,
    ...timings,
    totalMs: Math.round(nowMs() - requestStart),
  });

  return {
    session: sessionStats,
    deduped: alreadyProcessed,
  };
});
