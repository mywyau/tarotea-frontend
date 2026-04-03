import { useRuntimeConfig } from "#imports";
import { createError, readBody } from "h3";
import { db } from "~/server/repositories/db";
import { requireUser } from "~/server/utils/requireUser";
import { Client } from "@upstash/qstash";

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

type PayloadAnswer = {
  wordId: string;
  correct: boolean;
  delta: number;
};

type ExistingEventRow = {
  mode: QuizMode;
  total_delta: number;
  correct_count: number;
  total_questions: number;
};

const ALLOWED_MODES: QuizMode[] = [
  "grind-level",
  "grind-level-audio",
  "grind-topic",
  "grind-topic-audio",
];

const WRONG_PENALTY = -12;
const STREAK_CAP = 5;
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

function deltaFor(
  mode: QuizMode,
  correct: boolean,
  streakBefore: number,
): number {
  if (!correct) return WRONG_PENALTY;

  const effective = Math.min(streakBefore, STREAK_CAP);

  switch (mode) {
    case "grind-level":
    case "grind-level-audio":
    case "grind-topic":
    case "grind-topic-audio":
    default:
      return 5 + effective * 2;
  }
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
      map.set(wordId, correct);
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

async function getExistingEvent(
  userId: string,
  attemptId: string,
): Promise<ExistingEventRow | null> {
  const { rows } = await db.query<ExistingEventRow>(
    `
    select
      mode,
      total_delta,
      correct_count,
      total_questions
    from xp_quiz_events
    where user_id = $1
      and attempt_id = $2
    limit 1
    `,
    [userId, attemptId],
  );

  return rows[0] ?? null;
}

async function loadStreakMap(
  userId: string,
  wordIds: string[],
): Promise<Map<string, number>> {
  const { rows } = await db.query<{ word_id: string; streak: number | null }>(
    `
    select word_id, streak
    from user_word_progress
    where user_id = $1
      and word_id = any($2::text[])
    `,
    [userId, wordIds],
  );

  const streakMap = new Map<string, number>();

  for (const row of rows) {
    streakMap.set(row.word_id, Number(row.streak ?? 0));
  }

  return streakMap;
}

function buildPayloadAnswers(
  mode: QuizMode,
  wordOutcomeMap: Map<string, boolean>,
  streakMap: Map<string, number>,
): PayloadAnswer[] {
  return [...wordOutcomeMap.entries()].map(([wordId, correct]) => {
    const streakBefore = streakMap.get(wordId) ?? 0;

    return {
      wordId,
      correct,
      delta: deltaFor(mode, correct, streakBefore),
    };
  });
}

async function enqueueFinalizeJob(
  event: Parameters<typeof defineEventHandler>[0],
  job: { attemptId: string; userId: string },
): Promise<void> {
  const config = useRuntimeConfig(event);

  const qstashToken = config.qstashToken as string | undefined;
  const workerBaseUrl = config.public.siteUrl as string | undefined;

  if (!qstashToken) {
    throw new Error("Missing qstashToken runtime config");
  }

  if (!workerBaseUrl) {
    throw new Error("Missing public.siteUrl runtime config");
  }

  const workerUrl = `${workerBaseUrl.replace(/\/+$/, "")}/api/worker/xp-quiz-v3`;

  const client = new Client({
    token: qstashToken,
  });

  await client.publishJSON({
    url: workerUrl,
    body: job,
    retries: 3,
    deduplicationId: job.attemptId,
    flowControl: {
      key: "quiz-xp-word-progress",
      parallelism: 10,
      rate: 800,
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

  try {
    const existing = await getExistingEvent(userId, attemptId);

    if (existing) {
      await enqueueFinalizeJob(event, { attemptId, userId });

      return {
        quiz: {
          mode: existing.mode,
          correctCount: existing.correct_count,
          totalQuestions: existing.total_questions,
          xpEarned: existing.total_delta,
        },
        attemptId,
        deduped: true,
      };
    }

    const wordOutcomeMap = buildWordOutcomeMap(body.answers);
    const wordIds = [...wordOutcomeMap.keys()];

    const streakMap = await loadStreakMap(userId, wordIds);
    const payloadAnswers = buildPayloadAnswers(mode, wordOutcomeMap, streakMap);

    const correctCount = payloadAnswers.filter((a) => a.correct).length;
    const totalDelta = payloadAnswers.reduce((sum, a) => sum + a.delta, 0);
    const totalQuestions = payloadAnswers.length;

    const insertResult = await db.query<ExistingEventRow>(
      `
      insert into xp_quiz_events
        (
          attempt_id,
          user_id,
          mode,
          session_key,
          payload,
          total_delta,
          correct_count,
          total_questions
        )
      values
        ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
      on conflict (user_id, attempt_id) do nothing
      returning
        mode,
        total_delta,
        correct_count,
        total_questions
      `,
      [
        attemptId,
        userId,
        mode,
        attemptId,
        JSON.stringify({ answers: payloadAnswers }),
        totalDelta,
        correctCount,
        totalQuestions,
      ],
    );

    let responseRow = insertResult.rows[0] ?? null;

    if (!responseRow) {
      responseRow = await getExistingEvent(userId, attemptId);

      if (!responseRow) {
        throw new Error("Finalize event was not persisted");
      }
    }

    await enqueueFinalizeJob(event, { attemptId, userId });

    return {
      quiz: {
        mode: responseRow.mode,
        correctCount: responseRow.correct_count,
        totalQuestions: responseRow.total_questions,
        xpEarned: responseRow.total_delta,
      },
      attemptId,
      queued: true,
      deduped: false,
    };
  } catch (error) {
    console.error("VOCAB FINALIZE V3 FAILED", {
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