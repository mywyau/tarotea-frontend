// server/api/daily/jyutping/v2/xp-worker.post.ts

import { Receiver } from "@upstash/qstash";
import { createError, defineEventHandler, getHeader, readRawBody } from "h3";
import { db } from "~/server/repositories/db";
import { redis } from "~/server/repositories/redis";
import { masteryXp } from "@/config/xp/helpers";

type WorkerBody = {
  eventId: number | string;
  userId: string;
  sessionKey?: string;
};

type Payload = {
  answers: Array<{
    wordId: string;
    correct: boolean;
    delta: number;
  }>;
};

type ExistingEventRow = {
  id: number | string;
  user_id: string;
  payload: Payload | string | null;
  total_delta: number | string | null;
  applied_total_delta: number | string | null;
  correct_count: number | string | null;
  total_questions: number | string | null;
  processed: boolean | null;
};

type ExistingWordRow = {
  word_id: string;
  xp: number | string | null;
  streak: number | string | null;
};

type AggregatedWordUpdate = {
  wordId: string;
  xpBefore: number;
  xpAfter: number;
  appliedDelta: number;
  correctCount: number;
  wrongCount: number;
  finalCorrect: boolean;
  finalStreak: number;
  existedBefore: boolean;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw createError({
      statusCode: 500,
      statusMessage: `Missing env var: ${name}`,
    });
  }
  return value;
}

function getReceiver() {
  return new Receiver({
    currentSigningKey: requiredEnv("QSTASH_CURRENT_SIGNING_KEY"),
    nextSigningKey: requiredEnv("QSTASH_NEXT_SIGNING_KEY"),
  });
}

function getPublicUrl(
  event: Parameters<typeof defineEventHandler>[0] extends (
    event: infer E,
  ) => any
    ? E
    : never,
): string {
  const proto = getHeader(event, "x-forwarded-proto") ?? "https";
  const host = getHeader(event, "x-forwarded-host") ?? getHeader(event, "host");

  if (!host) {
    throw createError({
      statusCode: 500,
      statusMessage: "Missing host header for QStash verification",
    });
  }

  return `${proto}://${host}${event.path}`;
}

function buildAggregatedUpdates(
  answers: Payload["answers"],
  existingMap: Map<string, { xp: number; streak: number }>,
): {
  updates: AggregatedWordUpdate[];
  appliedTotalDelta: number;
  correctCount: number;
  totalQuestions: number;
  newWordsSeenCount: number;
  newWordsMaxedCount: number;
} {
  const perWord = new Map<string, AggregatedWordUpdate>();

  let appliedTotalDelta = 0;
  let correctCount = 0;

  for (const answer of answers) {
    if (!answer?.wordId) continue;

    const current = perWord.get(answer.wordId);
    const baseXp = existingMap.get(answer.wordId)?.xp ?? 0;
    const baseStreak = existingMap.get(answer.wordId)?.streak ?? 0;
    const existedBefore = existingMap.has(answer.wordId);

    const xpBeforeForAnswer = current ? current.xpAfter : baseXp;
    const streakBefore = current ? current.finalStreak : baseStreak;

    const xpAfterForAnswer = Math.min(
      masteryXp,
      Math.max(0, xpBeforeForAnswer + Number(answer.delta ?? 0)),
    );
    const appliedDeltaForAnswer = xpAfterForAnswer - xpBeforeForAnswer;
    const nextStreak = answer.correct
      ? Math.min(masteryXp, streakBefore + 1)
      : 0;

    appliedTotalDelta += appliedDeltaForAnswer;
    if (answer.correct) correctCount += 1;

    if (!current) {
      perWord.set(answer.wordId, {
        wordId: answer.wordId,
        xpBefore: baseXp,
        xpAfter: xpAfterForAnswer,
        appliedDelta: appliedDeltaForAnswer,
        correctCount: answer.correct ? 1 : 0,
        wrongCount: answer.correct ? 0 : 1,
        finalCorrect: !!answer.correct,
        finalStreak: nextStreak,
        existedBefore,
      });
      continue;
    }

    current.xpAfter = xpAfterForAnswer;
    current.appliedDelta += appliedDeltaForAnswer;
    current.correctCount += answer.correct ? 1 : 0;
    current.wrongCount += answer.correct ? 0 : 1;
    current.finalCorrect = !!answer.correct;
    current.finalStreak = nextStreak;
  }

  const updates = [...perWord.values()];
  const totalQuestions = answers.length;

  let newWordsSeenCount = 0;
  let newWordsMaxedCount = 0;

  for (const update of updates) {
    if (!update.existedBefore) {
      newWordsSeenCount += 1;
    }

    const wasMaxedBefore = update.xpBefore >= masteryXp;
    const isMaxedAfter = update.xpAfter >= masteryXp;

    if (!wasMaxedBefore && isMaxedAfter) {
      newWordsMaxedCount += 1;
    }
  }

  return {
    updates,
    appliedTotalDelta,
    correctCount,
    totalQuestions,
    newWordsSeenCount,
    newWordsMaxedCount,
  };
}

export default defineEventHandler(async (event) => {
  const signature =
    getHeader(event, "upstash-signature") ??
    getHeader(event, "Upstash-Signature");

  if (!signature) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing Upstash-Signature header",
    });
  }

  const rawBody = (await readRawBody(event, "utf8")) ?? "";

  try {
    await getReceiver().verify({
      signature,
      body: rawBody,
      url: getPublicUrl(event),
    });
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid QStash signature",
    });
  }

  let body: WorkerBody;

  try {
    body = JSON.parse(rawBody) as WorkerBody;
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid JSON body",
    });
  }

  const eventId = Number(body.eventId);
  const userId = body.userId;

  if (!Number.isFinite(eventId) || !userId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing or invalid eventId/userId",
    });
  }

  console.log("[xp-jyutping worker v2] invoked", {
    eventId,
    userId,
    sessionKey: body.sessionKey ?? null,
  });

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const eventRes = await client.query<ExistingEventRow>(
      `
      select
        id,
        user_id,
        payload,
        total_delta,
        applied_total_delta,
        correct_count,
        total_questions,
        processed
      from xp_jyutping_events
      where id = $1
        and user_id = $2
      for update
      `,
      [eventId, userId],
    );

    if (!eventRes.rowCount) {
      await client.query("COMMIT");

      return {
        ok: true,
        skipped: "event_not_found",
        eventId,
      };
    }

    const row = eventRes.rows[0];

    if (row.processed) {
      await client.query("COMMIT");

      return {
        ok: true,
        skipped: "already_processed",
        eventId,
      };
    }

    const payload: Payload =
      typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;

    const answers = payload?.answers ?? [];

    if (!answers.length) {
      await client.query(
        `
        update xp_jyutping_events
        set processed = true,
            processed_at = now(),
            applied_total_delta = 0,
            correct_count = 0,
            total_questions = 0
        where id = $1
        `,
        [eventId],
      );

      await client.query("COMMIT");

      await redis.del(`user:stats:v2:${userId}`).catch(() => {});

      return {
        ok: true,
        processedJyutpingEvents: 1,
        appliedAnswers: 0,
        eventId,
      };
    }

    const uniqueWordIds = [
      ...new Set(answers.map((item) => item.wordId).filter(Boolean)),
    ];

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

    const {
      updates,
      appliedTotalDelta,
      correctCount,
      totalQuestions,
      newWordsSeenCount,
      newWordsMaxedCount,
    } = buildAggregatedUpdates(answers, existingMap);

    const wrongCount = totalQuestions - correctCount;
    const statDate = new Date().toISOString().slice(0, 10);

    if (updates.length > 0) {
      await client.query(
        `
        insert into user_word_progress
          (
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
          $1::text,
          data.word_id,
          data.final_xp,
          data.final_streak,
          data.correct_count,
          data.wrong_count,
          now(),
          case when data.final_correct then now() else null end,
          now(),
          now()
        from unnest(
          $2::text[],
          $3::int[],
          $4::int[],
          $5::int[],
          $6::int[],
          $7::boolean[]
        ) as data(
          word_id,
          final_xp,
          final_streak,
          correct_count,
          wrong_count,
          final_correct
        )
        on conflict (user_id, word_id)
        do update set
          xp = excluded.xp,
          streak = excluded.streak,
          correct_count = coalesce(user_word_progress.correct_count, 0) + excluded.correct_count,
          wrong_count = coalesce(user_word_progress.wrong_count, 0) + excluded.wrong_count,
          last_seen_at = now(),
          last_correct_at = case
            when excluded.last_correct_at is not null then now()
            else user_word_progress.last_correct_at
          end,
          updated_at = now()
        `,
        [
          userId,
          updates.map((u) => u.wordId),
          updates.map((u) => u.xpAfter),
          updates.map((u) => u.finalStreak),
          updates.map((u) => u.correctCount),
          updates.map((u) => u.wrongCount),
          updates.map((u) => u.finalCorrect),
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
      [eventId, appliedTotalDelta, correctCount, totalQuestions],
    );

    await client.query("COMMIT");

    await redis.del(`user:stats:v2:${userId}`).catch(() => {});

    return {
      ok: true,
      processedJyutpingEvents: 1,
      appliedAnswers: updates.length,
      eventId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});
