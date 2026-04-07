import { Client } from "@upstash/qstash";
import { createError, readBody } from "h3";
import { db } from "~/server/repositories/db";
import { redis } from "~/server/repositories/redis";
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit";
import { requireUser } from "~/server/utils/requireUser";
import {
  chineseXp,
  chineseXpHintUsed,
  jyutpingXp,
  jyutpingXpHintUsed,
} from "~/utils/dojo/xp";

type BatchAttempt = {
  wordId: string;
  passed: boolean;
  hintUsed: boolean;
};

type FinalizeBody = {
  sessionKey: string;
  attempts: BatchAttempt[];
};

type DojoMode = "dojo-topic-jyutping" | "dojo-topic-chinese";

type QuizSession = {
  version: 1;
  mode: DojoMode;
  scope: "topic";
  slug: string;
  createdAt: string;
  allowedWordIds: string[];
};

type ExistingEventRow = {
  id: number | string;
  mode: string;
  total_delta: number | string | null;
  correct_count: number | string | null;
  total_questions: number | string | null;
  processed: boolean | null;
};

function isDojoMode(mode: string): mode is DojoMode {
  return mode === "dojo-topic-jyutping" || mode === "dojo-topic-chinese";
}

function deltaFor(attempt: BatchAttempt, mode: DojoMode) {
  if (!attempt.passed) return 0;

  switch (mode) {
    case "dojo-topic-jyutping":
      return attempt.hintUsed ? jyutpingXpHintUsed : jyutpingXp;
    case "dojo-topic-chinese":
      return attempt.hintUsed ? chineseXpHintUsed : chineseXp;
  }
}

export default defineEventHandler(async (event) => {

  const auth = await requireUser(event);
  const userId = auth.sub;

  await enforceRateLimit(`rl:finalize:typing-topic-sentences:${userId}`, 20, 60);

  const body = (await readBody(event)) as FinalizeBody;

  if (!body?.sessionKey) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing sessionKey",
    });
  }

  if (!Array.isArray(body.attempts)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid attempts",
    });
  }

  const sessionKey = body.sessionKey;
  const config = useRuntimeConfig();

  async function publishTypingWorker() {
    const qstash = new Client({
      token: config.qstashToken,
    });

    await qstash.publishJSON({
      url: `${config.public.siteUrl}/api/typing/topic/v2/xp-jyutping`,
      body: {
        userId,
        sessionKey,
      },
      retries: 3,
      flowControl: {
        key: "xp-typing-topic-v2",
        parallelism: 20,
        rate: 800,
        period: "1m",
      },
    });
  }

  const existingEventRes = await db.query<ExistingEventRow>(
    `
    select
      id,
      mode,
      total_delta,
      correct_count,
      total_questions,
      processed
    from xp_jyutping_events
    where user_id = $1
      and session_key = $2
    limit 1
    `,
    [userId, sessionKey],
  );

  if (existingEventRes.rows.length > 0) {
    const existing = existingEventRes.rows[0];

    if (!isDojoMode(existing.mode)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid dojo typing event",
      });
    }

    if (existing.processed) {
      return {
        session: {
          xpEarned: Number(existing.total_delta ?? 0),
          correctCount: Number(existing.correct_count ?? 0),
          totalWords: Number(existing.total_questions ?? 0),
        },
        deduped: true,
      };
    }

    await publishTypingWorker();

    return {
      session: {
        xpEarned: Number(existing.total_delta ?? 0),
        correctCount: Number(existing.correct_count ?? 0),
        totalWords: Number(existing.total_questions ?? 0),
      },
      queued: true,
      deduped: true,
    };
  }

  const redisKey = `dojo:typing:topic:${userId}:${sessionKey}`;
  const rawSession = await redis.get<QuizSession | string>(redisKey);

  if (!rawSession) {
    throw createError({
      statusCode: 410,
      statusMessage: "Dojo session expired",
    });
  }

  let session: QuizSession;

  try {
    session =
      typeof rawSession === "string"
        ? (JSON.parse(rawSession) as QuizSession)
        : (rawSession as QuizSession);
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: "Invalid dojo session",
    });
  }

  if (session.scope !== "topic" || !isDojoMode(session.mode)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid dojo session",
    });
  }

  const allowedWordIds = new Set(session.allowedWordIds ?? []);
  const attemptMap = new Map<string, BatchAttempt>();

  for (const attempt of body.attempts) {
    if (!attempt?.wordId) continue;

    if (!allowedWordIds.has(attempt.wordId)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid wordId in attempts: ${attempt.wordId}`,
      });
    }

    if (!attemptMap.has(attempt.wordId)) {
      attemptMap.set(attempt.wordId, {
        wordId: attempt.wordId,
        passed: !!attempt.passed,
        hintUsed: !!attempt.hintUsed,
      });
    }
  }

  const attempts = [...attemptMap.values()];

  if (attempts.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "No attempts",
    });
  }

  const payloadAnswers = attempts.map((attempt) => ({
    wordId: attempt.wordId,
    correct: !!attempt.passed,
    delta: deltaFor(attempt, session.mode),
  }));

  const correctCount = payloadAnswers.filter((a) => a.correct).length;
  const totalDelta = payloadAnswers.reduce((acc, a) => acc + a.delta, 0);
  const totalWords = session.allowedWordIds.length;

  const insertRes = await db.query<{ id: number | string }>(
    `
    insert into xp_jyutping_events (
      user_id,
      mode,
      level,
      session_key,
      payload,
      total_delta,
      correct_count,
      total_questions,
      processed
    )
    values (
      $1,
      $2,
      $3,
      $4,
      $5::jsonb,
      $6,
      $7,
      $8,
      false
    )
    on conflict (user_id, session_key) do nothing
    returning id
    `,
    [
      userId,
      session.mode,
      session.slug,
      sessionKey,
      JSON.stringify({
        answers: payloadAnswers,
      }),
      totalDelta,
      correctCount,
      totalWords,
    ],
  );

  if (insertRes.rows.length === 0) {
    const racedEventRes = await db.query<ExistingEventRow>(
      `
      select
        id,
        mode,
        total_delta,
        correct_count,
        total_questions,
        processed
      from xp_jyutping_events
      where user_id = $1
        and session_key = $2
      limit 1
      `,
      [userId, sessionKey],
    );

    if (racedEventRes.rows.length === 0) {
      throw createError({
        statusCode: 500,
        statusMessage: "Could not load queued dojo event",
      });
    }

    const existing = racedEventRes.rows[0];

    if (!isDojoMode(existing.mode)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid dojo typing event",
      });
    }

    if (!existing.processed) {
      await publishTypingWorker();
    }

    return {
      session: {
        xpEarned: Number(existing.total_delta ?? 0),
        correctCount: Number(existing.correct_count ?? 0),
        totalWords: Number(existing.total_questions ?? 0),
      },
      queued: !existing.processed,
      deduped: true,
    };
  }

  await publishTypingWorker();

  return {
    session: {
      xpEarned: totalDelta,
      correctCount,
      totalWords,
    },
    queued: true,
  };
});
