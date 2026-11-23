import { publishWordQuizXp } from "~/server/utils/publishWordQuizXp";
import { redactIdentifier } from "~/server/utils/logging/redact";
import { createError, readBody } from "h3";
import { db } from "~/server/repositories/db";
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit";
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

    const tRate0 = performance.now();
    await enforceRateLimit(`rl:quiz-finalize:user:${userId}`, 10, 60);
    const tRate1 = performance.now();

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

    const rawAnswers = [...wordOutcomeMap.entries()].map(
      ([wordId, correct]) => ({
        wordId,
        correct,
      }),
    );

    let totalQuestions = rawAnswers.length;
    let correctCount = rawAnswers.reduce(
      (sum, answer) => sum + (answer.correct ? 1 : 0),
      0,
    );
    const tValidate1 = performance.now();

    const tAcquire0 = performance.now();
    const client = await db.connect();
    const tAcquire1 = performance.now();

    let insertResult;
    let processed = false;
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
      if (!insertResult.rowCount) {
        const existing = await client.query<{
          mode: QuizMode;
          processed: boolean;
          correct_count: number;
          total_questions: number;
        }>(
          `select mode, processed, correct_count, total_questions from xp_quiz_events
           where user_id = $1 and attempt_id = $2`,
          [userId, attemptId],
        );
        const saved = existing.rows[0];
        if (!saved || !ALLOWED_MODES.includes(saved.mode)) {
          throw createError({ statusCode: 409, statusMessage: "Quiz attempt conflict" });
        }
        processed = saved.processed;
        mode = saved.mode;
        correctCount = saved.correct_count;
        totalQuestions = saved.total_questions;
      }
      const tQuery1 = performance.now();
      dbQueryMs = tQuery1 - tQuery0;
    } finally {
      client.release();
    }

    const inserted = Boolean(insertResult.rowCount);

    let enqueueMs = 0;

    let queued = false;
    let status: "processed" | "pending" | "recovery_pending" = processed ? "processed" : "pending";
    if (!processed) {
      const tEnqueue0 = performance.now();
      try {
        const delivery = await publishWordQuizXp(event, { attemptId, userId });
        queued = !delivery.deduplicated;
      } catch (enqueueError) {
        status = "recovery_pending";
        console.error("VOCAB FINALIZE ENQUEUE FAILED", {
          userHash: redactIdentifier(userId),
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
      userHash: redactIdentifier(userId),
      attemptId,
      mode,
      inserted,
      authMs: Math.round(tAuth1 - tAuth0),
      rateMs: Math.round(tRate1 - tRate0),
      bodyMs: Math.round(tBody1 - tBody0),
      validateMs: Math.round(tValidate1 - tValidate0),
      dbAcquireMs: Math.round(tAcquire1 - tAcquire0),
      dbQueryMs: Math.round(dbQueryMs),
      enqueueMs: Math.round(enqueueMs),
      totalMs: Math.round(totalMs),
    });

    return {
      attemptId,
      queued,
      deduped: !inserted,
      status,
      quiz: {
        mode,
        correctCount,
        totalQuestions,
      },
    };
  } catch (error: any) {
    const totalMs = performance.now() - t0;

    console.error("VOCAB FINALIZE V5 FAILED", {
      userHash: redactIdentifier(userId),
      attemptId,
      mode,
      totalMs: Math.round(totalMs),
      error,
    });

    if (error?.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 503,
      statusMessage: "Could not finalize quiz right now",
    });
  }
});
