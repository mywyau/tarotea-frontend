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

    if (!map.has(wordId)) {
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

async function enqueueFinalizeJob(
  event: Parameters<typeof defineEventHandler>[0],
  job: { attemptId: string; userId: string },
): Promise<void> {
  const config = useRuntimeConfig(event);
  const workerBaseUrl = config.public.siteUrl as string | undefined;

  if (!workerBaseUrl) {
    throw new Error("Missing public.siteUrl runtime config");
  }

  const workerUrl = `${workerBaseUrl.replace(/\/+$/, "")}/api/worker/xp-quiz-v4`;
  const client = getQstashClient(event);

  await client.publishJSON({
    url: workerUrl,
    body: job,
    retries: 3,
    deduplicationId: `${job.userId}:${job.attemptId}`,
    flowControl: {
      key: "quiz-finalize-vocab",
      parallelism: 20,
      rate: 2000,
      period: "1m",
    },
  });
}

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event);
  const userId = auth.sub;

  const body = (await readBody(event)) as FinalizeBody | undefined;

  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid payload",
    });
  }

  const attemptId = assertAttemptId(body.attemptId);
  const mode = normalizeMode(body);
  const wordOutcomeMap = buildWordOutcomeMap(body.answers);

  const rawAnswers = [...wordOutcomeMap.entries()].map(([wordId, correct]) => ({
    wordId,
    correct,
  }));

  const totalQuestions = rawAnswers.length;
  const correctCount = rawAnswers.reduce((sum, answer) => sum + (answer.correct ? 1 : 0), 0);

  try {
    const insertResult = await db.query<{ id: string }>(
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
          version: 1,
        }),
        totalQuestions,
        correctCount,
      ],
    );

    const inserted = insertResult.rowCount > 0;

    if (inserted) {
      try {
        await enqueueFinalizeJob(event, { attemptId, userId });
      } catch (enqueueError) {
        console.error("VOCAB FINALIZE ENQUEUE FAILED", {
          userId,
          attemptId,
          mode,
          enqueueError,
        });

        // Optional: keep this row discoverable by a sweeper job.
        // Could add columns like:
        // enqueue_failed_at, last_enqueue_error, queued_at
      }
    }

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
    console.error("VOCAB FINALIZE V4 FAILED", {
      userId,
      attemptId,
      mode,
      error,
    });

    throw createError({
      statusCode: 503,
      statusMessage: "Could not finalize quiz right now",
    });
  }
});