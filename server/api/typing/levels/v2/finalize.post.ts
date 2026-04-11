import { Client } from "@upstash/qstash";
import { createError, readBody } from "h3";
import {
  chineseXp,
  chineseXpHintUsed,
  jyutpingXp,
  jyutpingXpHintUsed,
} from "~/config/dojo/xp_config";
import { db } from "~/server/repositories/db";
import { redis } from "~/server/repositories/redis";
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit";
import { requireUser } from "~/server/utils/requireUser";

type BatchAttempt = {
  wordId: string;
  passed: boolean;
  hintUsed: boolean;
};

type FinalizeBody = {
  sessionKey: string;
  attempts: BatchAttempt[];
};

type DojoMode = "dojo-level-jyutping" | "dojo-level-chinese";

type QuizSession = {
  version: 1;
  mode: DojoMode;
  scope: "level";
  slug: string;
  createdAt: string;
  allowedWordIds: string[];
};

type ExistingEventRow = {
  id: number | string;
  mode: string;
  total_delta: number | string | null;
  applied_total_delta: number | string | null;
  correct_count: number | string | null;
  total_questions: number | string | null;
  processed: boolean | null;
};

function isDojoMode(mode: string): mode is DojoMode {
  return mode === "dojo-level-jyutping" || mode === "dojo-level-chinese";
}

function deltaFor(attempt: BatchAttempt, mode: DojoMode) {
  if (!attempt.passed) return 0;

  switch (mode) {
    case "dojo-level-jyutping":
      return attempt.hintUsed ? jyutpingXpHintUsed : jyutpingXp;
    case "dojo-level-chinese":
      return attempt.hintUsed ? chineseXpHintUsed : chineseXp;
  }
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
  console.info("[dojo-level-finalize]", JSON.stringify(details));
}

export default defineEventHandler(async (event) => {
  const requestStart = nowMs();
  const timings: Record<string, number> = {};

  const auth = await timedStep(timings, "authMs", async () =>
    requireUser(event),
  );
  const userId = auth.sub;

  await enforceRateLimit(
    `rl:finalize:typing-level-sentences:${userId}`,
    20,
    60,
  );

  const body = await timedStep(timings, "readBodyMs", async () => {
    return (await readBody(event)) as FinalizeBody;
  });

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
  const qstash = new Client({ token: config.qstashToken });

  async function publishTypingWorker() {
    return timedStep(timings, "publishMs", async () => {
      await qstash.publishJSON({
        url: `${config.public.siteUrl}/api/typing/levels/v2/xp-jyutping`,
        body: {
          userId,
          sessionKey,
        },
        retries: 3,
        flowControl: {
          key: "xp-typing-v2",
          parallelism: 20,
          rate: 800,
          period: "1m",
        },
      });
    });
  }

  const existingEventRes = await timedStep(
    timings,
    "existingEventLookupMs",
    async () => {
      return db.query<ExistingEventRow>(
        `
      select
        id,
        mode,
        total_delta,
        applied_total_delta,
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
    },
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
      logSummary({
        userId,
        sessionKey,
        deduped: true,
        processed: true,
        ...timings,
        totalMs: Math.round(nowMs() - requestStart),
      });

      return {
        session: {
          xpEarned: Number(
            existing.applied_total_delta ?? existing.total_delta ?? 0,
          ),
          correctCount: Number(existing.correct_count ?? 0),
          totalWords: Number(existing.total_questions ?? 0),
        },
        deduped: true,
      };
    }

    await publishTypingWorker();

    logSummary({
      userId,
      sessionKey,
      deduped: true,
      queued: true,
      processed: false,
      ...timings,
      totalMs: Math.round(nowMs() - requestStart),
    });

    return {
      session: {
        xpEarned: Number(
          existing.applied_total_delta ?? existing.total_delta ?? 0,
        ),
        correctCount: Number(existing.correct_count ?? 0),
        totalWords: Number(existing.total_questions ?? 0),
      },
      queued: true,
      deduped: true,
    };
  }

  const redisKey = `dojo:typing:level:${userId}:${sessionKey}`;
  const rawSession = await timedStep(timings, "sessionReadMs", async () => {
    return redis.get<QuizSession | string>(redisKey);
  });

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
        : rawSession;
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: "Invalid dojo session",
    });
  }

  if (session.scope !== "level" || !isDojoMode(session.mode)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid dojo session",
    });
  }

  const buildResult = await timedStep(
    timings,
    "attemptValidationMs",
    async () => {
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

      return { payloadAnswers, correctCount, totalDelta, totalWords };
    },
  );

  const { payloadAnswers, correctCount, totalDelta, totalWords } = buildResult;

  const insertRes = await timedStep(timings, "insertEventMs", async () => {
    return db.query<{ id: number | string }>(
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
        JSON.stringify({ answers: payloadAnswers }),
        totalDelta,
        correctCount,
        totalWords,
      ],
    );
  });

  if (insertRes.rows.length === 0) {
    const racedEventRes = await timedStep(
      timings,
      "racedEventLookupMs",
      async () => {
        return db.query<ExistingEventRow>(
          `
        select
          id,
          mode,
          total_delta,
          applied_total_delta,
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
      },
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

    logSummary({
      userId,
      sessionKey,
      deduped: true,
      queued: !existing.processed,
      ...timings,
      totalMs: Math.round(nowMs() - requestStart),
    });

    return {
      session: {
        xpEarned: Number(
          existing.applied_total_delta ?? existing.total_delta ?? 0,
        ),
        correctCount: Number(existing.correct_count ?? 0),
        totalWords: Number(existing.total_questions ?? 0),
      },
      queued: !existing.processed,
      deduped: true,
    };
  }

  await publishTypingWorker();

  logSummary({
    userId,
    sessionKey,
    queued: true,
    deduped: false,
    totalDelta,
    correctCount,
    totalWords,
    ...timings,
    totalMs: Math.round(nowMs() - requestStart),
  });

  return {
    session: {
      xpEarned: totalDelta,
      correctCount,
      totalWords,
    },
    queued: true,
  };
});
