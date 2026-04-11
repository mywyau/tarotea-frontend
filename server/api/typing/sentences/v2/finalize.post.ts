import { Client } from "@upstash/qstash";
import { createError, readBody } from "h3";
import {
  chineseOnlySentenceHintXp,
  chineseOnlySentenceXp,
} from "~/config/xp/helpers";
import { db } from "~/server/repositories/db";
import { redis } from "~/server/repositories/redis";
import { requireUser } from "~/server/utils/requireUser";

type SentenceBatchAttempt = {
  sentenceId: string;
  sourceWordId: string;
  passed: boolean;
  hintUsed: boolean;
};

type FinalizeBody = {
  sessionKey: string;
  attempts: SentenceBatchAttempt[];
};

type DojoMode = "dojo-level-sentences-chinese" | "dojo-topic-sentences-chinese";

type QuizSession = {
  version: 1;
  mode: DojoMode;
  scope: "level" | "topic";
  slug: string;
  createdAt: string;
  allowedSentences: Array<{
    sentenceId: string;
    sourceWordId: string;
  }>;
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

function getSessionRedisKey(userId: string, sessionKey: string) {
  return `dojo:sentence:${userId}:${sessionKey}`;
}

function isDojoMode(mode: string): mode is DojoMode {
  return (
    mode === "dojo-level-sentences-chinese" ||
    mode === "dojo-topic-sentences-chinese"
  );
}

function deltaFor(attempt: SentenceBatchAttempt, mode: DojoMode) {
  if (!attempt.passed) return 0;

  switch (mode) {
    case "dojo-level-sentences-chinese":
    case "dojo-topic-sentences-chinese":
      return attempt.hintUsed
        ? chineseOnlySentenceHintXp
        : chineseOnlySentenceXp;
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
  console.info("[dojo-sentence-finalize]", JSON.stringify(details));
}

export default defineEventHandler(async (event) => {
  const requestStart = nowMs();
  const timings: Record<string, number> = {};

  const auth = await timedStep(timings, "authMs", async () =>
    requireUser(event),
  );
  const userId = auth.sub;

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

  async function publishSentenceDojoWorker() {
    return timedStep(timings, "publishMs", async () => {
      await qstash.publishJSON({
        url: `${config.public.siteUrl}/api/typing/sentences/v2/xp-chinese`,
        body: {
          userId,
          sessionKey,
        },
        retries: 3,
        flowControl: {
          key: "xp-chinese-sentence-dojo",
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
        statusMessage: "Invalid sentence dojo event",
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
          totalSentences: Number(existing.total_questions ?? 0),
        },
        deduped: true,
      };
    }

    await publishSentenceDojoWorker();

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
        totalSentences: Number(existing.total_questions ?? 0),
      },
      queued: true,
      deduped: true,
    };
  }

  const rawSession = await timedStep(timings, "sessionReadMs", async () => {
    return redis.get<QuizSession | string>(
      getSessionRedisKey(userId, sessionKey),
    );
  });

  if (!rawSession) {
    throw createError({
      statusCode: 410,
      statusMessage: "Sentence dojo session expired",
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
      statusMessage: "Invalid sentence dojo session",
    });
  }

  if (!isDojoMode(session.mode)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid sentence dojo session",
    });
  }

  const buildResult = await timedStep(
    timings,
    "attemptValidationMs",
    async () => {
      const allowedPairs = new Set(
        (session.allowedSentences ?? []).map(
          (s) => `${s.sentenceId}:${s.sourceWordId}`,
        ),
      );

      const attemptMap = new Map<string, SentenceBatchAttempt>();

      for (const attempt of body.attempts) {
        if (!attempt?.sentenceId || !attempt?.sourceWordId) continue;

        const pairKey = `${attempt.sentenceId}:${attempt.sourceWordId}`;

        if (!allowedPairs.has(pairKey)) {
          throw createError({
            statusCode: 400,
            statusMessage: `Invalid sentence attempt: ${pairKey}`,
          });
        }

        if (!attemptMap.has(attempt.sentenceId)) {
          attemptMap.set(attempt.sentenceId, {
            sentenceId: attempt.sentenceId,
            sourceWordId: attempt.sourceWordId,
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
        sentenceId: attempt.sentenceId,
        wordId: attempt.sourceWordId,
        correct: !!attempt.passed,
        hintUsed: !!attempt.hintUsed,
        delta: deltaFor(attempt, session.mode),
      }));

      const correctCount = payloadAnswers.filter((a) => a.correct).length;
      const totalDelta = payloadAnswers.reduce((acc, a) => acc + a.delta, 0);
      const totalSentences = session.allowedSentences.length;

      return { payloadAnswers, correctCount, totalDelta, totalSentences };
    },
  );

  const { payloadAnswers, correctCount, totalDelta, totalSentences } =
    buildResult;

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
        JSON.stringify({
          answers: payloadAnswers,
        }),
        totalDelta,
        correctCount,
        totalSentences,
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
        statusMessage: "Could not load queued sentence dojo event",
      });
    }

    const existing = racedEventRes.rows[0];

    if (!isDojoMode(existing.mode)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid sentence dojo event",
      });
    }

    if (!existing.processed) {
      await publishSentenceDojoWorker();
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
        totalSentences: Number(existing.total_questions ?? 0),
      },
      queued: !existing.processed,
      deduped: true,
    };
  }

  await publishSentenceDojoWorker();

  logSummary({
    userId,
    sessionKey,
    queued: true,
    deduped: false,
    totalDelta,
    correctCount,
    totalSentences,
    ...timings,
    totalMs: Math.round(nowMs() - requestStart),
  });

  return {
    session: {
      xpEarned: totalDelta,
      correctCount,
      totalSentences,
    },
    queued: true,
  };
});
