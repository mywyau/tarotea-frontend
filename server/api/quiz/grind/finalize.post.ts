// server/api/quiz/grind/finalize.post.ts

import { createError, getHeader, readBody } from "h3";
import { db } from "~/server/repositories/db";
import { requireUser } from "~/server/utils/requireUser";

type Answer = { wordId: string; sentenceId?: string; correct: boolean };

type QuizMode =
  | "grind-level"
  | "grind-level-audio"
  | "grind-topic"
  | "grind-topic-audio"
  | "level-sentences"
  | "topic-sentences"
  | "level-sentences-audio"
  | "topic-sentences-audio";

type FinalizeBody = {
  mode?: QuizMode;
  quizType?: string; // optional backward compatibility
  answers: Answer[];
};

const ALLOWED_MODES: QuizMode[] = [
  "grind-level",
  "grind-level-audio",
  "grind-topic",
  "grind-topic-audio",
  "level-sentences",
  "topic-sentences",
  "level-sentences-audio",
  "topic-sentences-audio",
];

export default defineEventHandler(async (event) => {
  console.log("🔥 FINALIZE CALLED");

  const userId = await requireUser(event);
  const body = (await readBody(event)) as FinalizeBody;

  if (!body || !Array.isArray(body.answers)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid payload" });
  }

  const rawMode = body.mode ?? body.quizType ?? "grind-level";

  if (!ALLOWED_MODES.includes(rawMode as QuizMode)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid quiz mode",
    });
  }

  const mode = rawMode as QuizMode;

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
      case "level-sentences":
      case "topic-sentences":
      case "level-sentences-audio":
      case "topic-sentences-audio":
        return 10 + effective * 3;
      case "grind-level":
      case "grind-topic":
      case "grind-level-audio":
      case "grind-topic-audio":
        return 5 + effective * 2;
      default:
        return 5 + effective * 2;
    }
  }

  function dedupeAnswers(mode: QuizMode, answers: Answer[]): Answer[] {
    switch (mode) {
      case "level-sentences":
      case "topic-sentences":
      case "level-sentences-audio":
      case "topic-sentences-audio":
      case "grind-level":
      case "grind-topic":
      case "grind-level-audio":
      case "grind-topic-audio":
      default: {
        const map = new Map<string, boolean>();

        for (const a of answers) {
          if (!a?.wordId) continue;
          if (!map.has(a.wordId)) {
            map.set(a.wordId, !!a.correct);
          }
        }

        return [...map.entries()].map(([wordId, correct]) => ({
          wordId,
          correct,
        }));
      }
    }
  }

  const answers = dedupeAnswers(mode, body.answers);

  if (answers.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "No answers" });
  }

  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const streakMap = new Map<string, number>();

    const streakRes = await client.query(
      `
      select word_id, streak
      from user_word_progress
      where user_id = $1 and word_id = any($2::text[])
      `,
      [userId, answers.map((a) => a.wordId)],
    );

    for (const r of streakRes.rows) {
      streakMap.set(r.word_id, Number(r.streak ?? 0));
    }

    const payloadAnswers = answers.map((a) => {
      const streakBefore = streakMap.get(a.wordId) ?? 0;

      return {
        wordId: a.wordId,
        correct: a.correct,
        delta: deltaFor(mode, a.correct, streakBefore),
      };
    });

    const correctCount = payloadAnswers.filter((a) => a.correct).length;
    const totalDelta = payloadAnswers.reduce((acc, a) => acc + a.delta, 0);

    const sessionKey = `${mode}:${Date.now()}:${userId}`;

    await client.query(
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

    const sentenceAnswers = body.answers.filter(
      (a) => typeof a.sentenceId === "string" && a.sentenceId.length > 0,
    );

    for (const a of sentenceAnswers) {
      await client.query(
        `
    insert into user_sentence_progress (
      user_id,
      word_id,
      sentence_id,
      seen_count,
      correct_count,
      wrong_count,
      last_seen_at,
      created_at,
      updated_at
    )
    values (
      $1, $2, $3, 1,
      case when $4 then 1 else 0 end,
      case when $4 then 0 else 1 end,
      now(), now(), now()
    )
    on conflict (user_id, sentence_id)
    do update set
      seen_count = user_sentence_progress.seen_count + 1,
      correct_count = user_sentence_progress.correct_count + case when $4 then 1 else 0 end,
      wrong_count = user_sentence_progress.wrong_count + case when $4 then 0 else 1 end,
      last_seen_at = now(),
      updated_at = now()
    `,
        [userId, a.wordId, a.sentenceId, a.correct],
      );
    }

    await client.query("COMMIT");

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
  } catch (e) {
    console.error("FINALIZE FAILED", {
      mode,
      body,
      error: e,
    });
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});
