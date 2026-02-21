import { createError, getHeader, readBody } from "h3";
import { db } from "~/server/db";
import { requireUser } from "~/server/utils/requireUser";

type Answer = { wordId: string; correct: boolean };

export default defineEventHandler(async (event) => {
  console.log("🔥 FINALIZE CALLED");

  const userId = await requireUser(event);
  const body = (await readBody(event)) as { answers: Answer[] };

  if (!body || !Array.isArray(body.answers)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid payload" });
  }

  // de-dupe answers
  const map = new Map<string, boolean>();
  for (const a of body.answers) {
    if (!a?.wordId) continue;
    if (!map.has(a.wordId)) map.set(a.wordId, !!a.correct);
  }

  const answers = [...map.entries()].map(([wordId, correct]) => ({
    wordId,
    correct,
  }));

  if (answers.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "No answers" });
  }

  const client = await db.connect();
  await client.query("BEGIN");

  try {
    // fetch streaks
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

    const STREAK_CAP = 5;

    function deltaFor(correct: boolean, streakBefore: number) {
      if (!correct) return 0;
      const effective = Math.min(streakBefore, STREAK_CAP);
      return 5 + effective * 2;
    }

    const payloadAnswers = answers.map((a) => {
      const streakBefore = streakMap.get(a.wordId) ?? 0;
      return {
        wordId: a.wordId,
        correct: a.correct,
        delta: deltaFor(a.correct, streakBefore),
      };
    });

    const correctCount = payloadAnswers.filter((a) => a.correct).length;
    const totalDelta = payloadAnswers.reduce((acc, a) => acc + a.delta, 0);

    const sessionKey = `grind:${Date.now()}:${userId}`;

    await client.query(
      `
      insert into xp_quiz_events
        (user_id, mode, session_key, payload, total_delta, correct_count, total_questions)
      values
        ($1, 'grind', $2, $3::jsonb, $4, $5, $6)
      `,
      [
        userId,
        sessionKey,
        JSON.stringify({ answers: payloadAnswers }),
        totalDelta,
        correctCount,
        payloadAnswers.length,
      ],
    );

    await client.query("COMMIT");

    // trigger worker
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
        correctCount,
        totalQuestions: payloadAnswers.length,
        xpEarned: totalDelta,
      },
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});
