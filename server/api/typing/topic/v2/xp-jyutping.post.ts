import { Receiver } from "@upstash/qstash";
import { createError, getHeader, readRawBody } from "h3";
import { db } from "~/server/repositories/db";
import { redis } from "~/server/repositories/redis";
import { masteryXp } from "@/config/xp/helpers";

type WorkerBody = {
  userId: string;
  sessionKey: string;
};

type DojoMode = "dojo-topic-jyutping" | "dojo-topic-chinese";

type PayloadAnswer = {
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
  correctInc: number;
  wrongInc: number;
  appliedDelta: number;
  existedBefore: boolean;
};

function isDojoMode(mode: string): mode is DojoMode {
  return mode === "dojo-topic-jyutping" || mode === "dojo-topic-chinese";
}

function parseStoredPayload(
  payload: ExistingEventRow["payload"],
): StoredEventPayload {
  if (!payload) {
    throw createError({
      statusCode: 500,
      statusMessage: "Dojo event payload missing",
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
      xpBefore,
      xpAfter: xp,
      streak,
      correctInc,
      wrongInc,
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

  const isValid = await receiver.verify({
    signature,
    body: rawBody,
    url: `${config.public.siteUrl}/api/typing/topic/v2/xp-jyutping`,
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
    totalWords: 0,
  };
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
      from xp_jyutping_events
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
        statusMessage: "Dojo event not found",
      });
    }

    const quizEvent = eventRes.rows[0];

    if (!isDojoMode(quizEvent.mode)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid topic dojo event",
      });
    }

    if (quizEvent.processed) {
      alreadyProcessed = true;

      sessionStats = {
        xpEarned: Number(
          quizEvent.applied_total_delta ?? quizEvent.total_delta ?? 0,
        ),
        correctCount: Number(quizEvent.correct_count ?? 0),
        totalWords: Number(quizEvent.total_questions ?? 0),
      };

      await client.query("COMMIT");
    } else {
      const storedPayload = parseStoredPayload(quizEvent.payload);
      const payloadAnswers = storedPayload.answers ?? [];

      if (payloadAnswers.length === 0) {
        throw createError({
          statusCode: 500,
          statusMessage: "Dojo event has no answers payload",
        });
      }

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

      const correctCount = payloadAnswers.filter((a) => a.correct).length;
      const totalWords = payloadAnswers.length;
      const wrongCount = totalWords - correctCount;
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

      sessionStats = {
        xpEarned: appliedTotalDelta,
        correctCount,
        totalWords,
      };

      if (rolledUpWordProgress.length > 0) {
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
            t.xp_after,
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
          ) as t(word_id, xp_after, streak, correct_inc, wrong_inc)
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
            rolledUpWordProgress.map((r) => r.xpAfter),
            rolledUpWordProgress.map((r) => r.streak),
            rolledUpWordProgress.map((r) => r.correctInc),
            rolledUpWordProgress.map((r) => r.wrongInc),
          ],
        );
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
        [userId, statDate, appliedTotalDelta, correctCount, wrongCount, 0, 1],
      );

      await client.query(
        `
        update xp_jyutping_events
        set processed = true,
            processed_at = now(),
            applied_total_delta = $2,
            correct_count = $3,
            total_questions = $4
        where id = $1
        `,
        [quizEvent.id, appliedTotalDelta, correctCount, totalWords],
      );

      await client.query("COMMIT");
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  await redis.del(`dojo:typing:topic:${userId}:${sessionKey}`).catch(() => {});
  await redis.del(`user:stats:v2:${userId}`).catch(() => {});

  return {
    session: sessionStats,
    deduped: alreadyProcessed,
  };
});
