import { useRuntimeConfig } from "#imports";
import { createError, readBody } from "h3";
import { Client } from "@upstash/qstash";
import { db } from "~/server/repositories/db";
import { requireUser } from "~/server/utils/requireUser";

type Answer = {
  wordId: string;
  correct: boolean;
};

type QuizMode =
  | "grind-level"
  | "grind-level-audio"
  | "grind-topic"
  | "grind-topic-audio";

type FinalizeBody = {
  attemptId: string;
  mode?: QuizMode;
  quizType?: string;
  answers: Answer[];
};

const ALLOWED_MODES: QuizMode[] = [
  "grind-level",
  "grind-level-audio",
  "grind-topic",
  "grind-topic-audio",
];

const MAX_ATTEMPT_ID_LENGTH = 120;
const MAX_UNIQUE_WORDS = 100;

function normalizeMode(body: FinalizeBody): QuizMode {
  const rawMode = body.mode ?? body.quizType ?? "grind-level";

  if (!ALLOWED_MODES.includes(rawMode as QuizMode)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid quiz mode",
    });
  }

  return rawMode as QuizMode;
}

function assertAttemptId(raw: unknown): string {
  if (typeof raw !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing attemptId",
    });
  }

  const attemptId = raw.trim();

  if (!attemptId || attemptId.length > MAX_ATTEMPT_ID_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid attemptId",
    });
  }

  return attemptId;
}

function buildWordOutcomeMap(rawAnswers: unknown): Map<string, boolean> {
  if (!Array.isArray(rawAnswers)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid payload",
    });
  }

  const map = new Map<string, boolean>();

  for (const item of rawAnswers) {
    if (!item || typeof item !== "object") continue;

    const wordId = (item as { wordId?: unknown }).wordId;
    const correct = (item as { correct?: unknown }).correct;

    if (typeof wordId !== "string" || !wordId.trim()) continue;
    if (typeof correct !== "boolean") continue;

    if (!map.has(wordId.trim())) {
      map.set(wordId.trim(), correct);
    }
  }

  if (map.size === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "No answers",
    });
  }

  if (map.size > MAX_UNIQUE_WORDS) {
    throw createError({
      statusCode: 400,
      statusMessage: "Too many answers",
    });
  }

  return map;
}

let qstashClient: Client | null = null;

function getQstashClient(event: Parameters<typeof defineEventHandler>[0]): Client {
  if (qstashClient) return qstashClient;

  const config = useRuntimeConfig(event);
  const qstashToken = config.qstashToken as string | undefined;

  if (!qstashToken) {
    throw new Error("Missing qstashToken runtime config");
  }

  qstashClient = new Client({ token: qstashToken });
  return qstashClient;
}

function safeDeduplicationId(job: { attemptId: string; userId: string }): string {
  return `${job.userId}__${job.attemptId}`.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function enqueueFinalizeJob(
  event: Parameters<typeof defineEventHandler>[0],
  job: { attemptId: string; userId: string },
): Promise<void> {
  const config = useRuntimeConfig(event);
  const workerBaseUrl = config.public.siteUrl as string | undefined;

  if (!workerBaseUrl) {
    throw new Error("Missing public.siteUrl runtime config");
  }

  const workerUrl = `${workerBaseUrl.replace(/\/+$/, "")}/api/worker/xp-quiz-v5`;
  const client = getQstashClient(event);

  await client.publishJSON({
    url: workerUrl,
    body: job,
    retries: 3,
    deduplicationId: safeDeduplicationId(job),
    flowControl: {
      key: "quiz-finalize-vocab",
      parallelism: 20,
      rate: 2000,
      period: "1m",
    },
  });
}

export default defineEventHandler(async (event) => {
  const t0 = performance.now();

  let attemptId = "unknown";
  let userId = "unknown";
  let mode: QuizMode | "unknown" = "unknown";

  try {
    const tAuth0 = performance.now();
    const auth = await requireUser(event);
    userId = auth.sub;
    const tAuth1 = performance.now();

    const tBody0 = performance.now();
    const body = (await readBody(event)) as FinalizeBody | undefined;
    const tBody1 = performance.now();

    if (!body) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid payload",
      });
    }

    const tValidate0 = performance.now();
    attemptId = assertAttemptId(body.attemptId);
    mode = normalizeMode(body);
    const wordOutcomeMap = buildWordOutcomeMap(body.answers);

    const rawAnswers = [...wordOutcomeMap.entries()].map(([wordId, correct]) => ({
      wordId,
      correct,
    }));

    const totalQuestions = rawAnswers.length;
    const correctCount = rawAnswers.reduce(
      (sum, answer) => sum + (answer.correct ? 1 : 0),
      0,
    );
    const tValidate1 = performance.now();

    const tAcquire0 = performance.now();
    const client = await db.connect();
    const tAcquire1 = performance.now();

    let insertResult;
    let dbQueryMs = 0;

    try {
      const tQuery0 = performance.now();
      insertResult = await client.query<{ id: string }>(
        `
        insert into xp_quiz_events
          (
            attempt_id,
            user_id,
            mode,
            session_key,
            payload,
            total_questions,
            correct_count,
            processed,
            processed_at
          )
        values
          ($1, $2, $3, $4, $5::jsonb, $6, $7, false, null)
        on conflict (user_id, attempt_id) do nothing
        returning attempt_id as id
        `,
        [
          attemptId,
          userId,
          mode,
          attemptId,
          JSON.stringify({
            answers: rawAnswers,
            version: 2,
          }),
          totalQuestions,
          correctCount,
        ],
      );
      const tQuery1 = performance.now();
      dbQueryMs = tQuery1 - tQuery0;
    } finally {
      client.release();
    }

    const inserted = insertResult.rowCount > 0;

    let enqueueMs = 0;

    if (inserted) {
      const tEnqueue0 = performance.now();
      try {
        await enqueueFinalizeJob(event, { attemptId, userId });
      } catch (enqueueError) {
        console.error("VOCAB FINALIZE ENQUEUE FAILED", {
          userId,
          attemptId,
          mode,
          enqueueError,
        });
      }
      const tEnqueue1 = performance.now();
      enqueueMs = tEnqueue1 - tEnqueue0;
    }

    const totalMs = performance.now() - t0;

    console.log("VOCAB FINALIZE TIMING", {
      userId,
      attemptId,
      mode,
      inserted,
      authMs: Math.round(tAuth1 - tAuth0),
      bodyMs: Math.round(tBody1 - tBody0),
      validateMs: Math.round(tValidate1 - tValidate0),
      dbAcquireMs: Math.round(tAcquire1 - tAcquire0),
      dbQueryMs: Math.round(dbQueryMs),
      enqueueMs: Math.round(enqueueMs),
      totalMs: Math.round(totalMs),
    });

    return {
      attemptId,
      queued: inserted,
      deduped: !inserted,
      status: "pending",
      quiz: {
        mode,
        correctCount,
        totalQuestions,
      },
    };
  } catch (error) {
    const totalMs = performance.now() - t0;

    console.error("VOCAB FINALIZE V5 FAILED", {
      userId,
      attemptId,
      mode,
      totalMs: Math.round(totalMs),
      error,
    });

    throw createError({
      statusCode: 503,
      statusMessage: "Could not finalize quiz right now",
    });
  }
});