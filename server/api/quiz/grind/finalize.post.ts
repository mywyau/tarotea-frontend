// server/api/quiz/grind/finalize.post.ts

import { createError, getHeader, readBody } from "h3";
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
  mode?: QuizMode;
  quizType?: string;
  answers: Answer[];
};

type PayloadAnswer = {
  wordId: string;
  correct: boolean;
  delta: number;
};

const ALLOWED_MODES: QuizMode[] = [
  "grind-level",
  "grind-level-audio",
  "grind-topic",
  "grind-topic-audio",
];

const WRONG_PENALTY = -12;
const STREAK_CAP = 5;

function deltaFor(
  mode: QuizMode,
  correct: boolean,
  streakBefore: number,
): number {
  if (!correct) return WRONG_PENALTY;

  const effective = Math.min(streakBefore, STREAK_CAP);

  switch (mode) {
    case "grind-level":
    case "grind-topic":
    case "grind-level-audio":
    case "grind-topic-audio":
    default:
      return 5 + effective * 2;
  }
}

function buildWordOutcomeMap(rawAnswers: Answer[]): Map<string, boolean> {
  const map = new Map<string, boolean>();

  for (const answer of rawAnswers) {
    if (!answer?.wordId) continue;

    // Keep first outcome for this word in the batch
    if (!map.has(answer.wordId)) {
      map.set(answer.wordId, !!answer.correct);
    }
  }

  return map;
}

function buildPayloadAnswers(
  mode: QuizMode,
  rawAnswers: Answer[],
  streakMap: Map<string, number>,
): PayloadAnswer[] {
  const wordOutcomeMap = buildWordOutcomeMap(rawAnswers);

  return [...wordOutcomeMap.entries()].map(([wordId, correct]) => {
    const streakBefore = streakMap.get(wordId) ?? 0;

    return {
      wordId,
      correct,
      delta: deltaFor(mode, correct, streakBefore),
    };
  });
}

export default defineEventHandler(async (event) => {
  const userId = await requireUser(event);
  const body = (await readBody(event)) as FinalizeBody;

  if (!body || !Array.isArray(body.answers)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid payload",
    });
  }

  const rawMode = body.mode ?? body.quizType ?? "grind-level";

  if (!ALLOWED_MODES.includes(rawMode as QuizMode)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid quiz mode",
    });
  }

  const mode = rawMode as QuizMode;

  const wordOutcomeMap = buildWordOutcomeMap(body.answers);

  if (wordOutcomeMap.size === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "No answers",
    });
  }

  try {
    const { rows } = await db.query(
      `
      select word_id, streak
      from user_word_progress
      where user_id = $1
        and word_id = any($2::text[])
      `,
      [userId, [...wordOutcomeMap.keys()]],
    );

    const streakMap = new Map<string, number>();

    for (const row of rows) {
      streakMap.set(row.word_id, Number(row.streak ?? 0));
    }

    const payloadAnswers = buildPayloadAnswers(mode, body.answers, streakMap);

    const correctCount = payloadAnswers.filter((a) => a.correct).length;
    const totalDelta = payloadAnswers.reduce((acc, a) => acc + a.delta, 0);

    const sessionKey = `${mode}:${Date.now()}:${userId}`;

    await db.query(
      `
      insert into xp_quiz_events
        (user_id, mode, session_key, payload, total_delta, correct_count, total_questions)
      values
        ($1, $2, $3, $4::jsonb, $5, $6, $7)
      `,
      [
        userId,
        mode,
        sessionKey,
        JSON.stringify({ answers: payloadAnswers }),
        totalDelta,
        correctCount,
        payloadAnswers.length,
      ],
    );

    const host =
      getHeader(event, "x-forwarded-host") ?? getHeader(event, "host");
    const proto = getHeader(event, "x-forwarded-proto") ?? "https";

    if (host) {
      fetch(`${proto}://${host}/api/worker/xp-quiz`, {
        method: "POST",
      }).catch(() => {});
    }

    return {
      quiz: {
        mode,
        correctCount,
        totalQuestions: payloadAnswers.length,
        xpEarned: totalDelta,
      },
    };
  } catch (error) {
    console.error("VOCAB FINALIZE FAILED", {
      mode,
      body,
      error,
    });
    throw error;
  }
});