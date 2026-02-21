import { createError, getHeader, readBody } from "h3";
import { db } from "~/server/db";
import { requireUser } from "~/server/utils/requireUser";

type Answer = { wordId: string; correct: boolean };

export default defineEventHandler(async (event) => {
  const userId = await requireUser(event);
  const body = (await readBody(event)) as { answers: Answer[] };

  if (!body || !Array.isArray(body.answers)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid payload" });
  }

  // de-dupe by wordId
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
    // lock today's daily session
    const sessRes = await client.query(
      `
        select completed, word_ids, total_questions, session_date
        from daily_sessions
        where user_id = $1 and session_date = current_date
        for update
      `,
      [userId],
    );

    if (!sessRes.rowCount) {
      throw createError({
        statusCode: 404,
        statusMessage: "Daily session not started",
      });
    }

    const sess = sessRes.rows[0] as {
      completed: boolean;
      word_ids: string[];
      total_questions: number;
      session_date: string; // date comes back like '2026-02-21'
    };

    const sessionKey = `daily:${sess.session_date}:${userId}`;

    // idempotent: if already completed, just return snapshot
    if (sess.completed) {
      const snap = await client.query(
        `
        select answered_count, correct_count, xp_earned, total_questions
        from daily_sessions
        where user_id = $1 and session_date = current_date
        `,
        [userId],
      );
      await client.query("COMMIT");
      return {
        daily: {
          answeredCount: snap.rows[0]?.answered_count ?? 0,
          correctCount: snap.rows[0]?.correct_count ?? 0,
          xpEarned: snap.rows[0]?.xp_earned ?? 0,
          totalQuestions: snap.rows[0]?.total_questions ?? 0,
        },
      };
    }

    // Validate answers are from today's word list
    const allowed = new Set(sess.word_ids ?? []);
    const filtered = answers.filter((a) => allowed.has(a.wordId));

    if (filtered.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Answers do not match today's word list",
      });
    }

    const STREAK_CAP = 5;
    const streakMap = new Map<string, number>();

    // fetch streaks for these words (missing row => streak 0)
    const streakRes = await client.query(
      `
        select word_id, streak
        from user_word_progress
        where user_id = $1 and word_id = any($2::text[])
      `,
      [userId, filtered.map((a) => a.wordId)],
    );

    for (const r of streakRes.rows) {
      streakMap.set(r.word_id, Number(r.streak ?? 0));
    }

    function deltaFor(correct: boolean, streakBefore: number) {
      if (!correct) return 0;
      const effective = Math.min(streakBefore, STREAK_CAP);
      return 5 + effective * 2;
    }

    const payloadAnswers = filtered.map((a) => {
      const streakBefore = streakMap.get(a.wordId) ?? 0;
      return {
        wordId: a.wordId,
        correct: a.correct,
        delta: deltaFor(a.correct, streakBefore),
      };
    });

    const answeredCount = payloadAnswers.length;
    const correctCount = payloadAnswers.reduce(
      (acc, a) => acc + (a.correct ? 1 : 0),
      0,
    );
    const totalDelta = payloadAnswers.reduce((acc, a) => acc + a.delta, 0);

    //

    if (filtered.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Answers do not match today's word list",
      });
    }

    // const payloadAnswers = filtered.map((a) => ({
    //   wordId: a.wordId,
    //   correct: a.correct,
    //   delta: deltaForDaily(a.correct),
    // }));

    // const answeredCount = payloadAnswers.length;
    // const correctCount = payloadAnswers.reduce(
    //   (acc, a) => acc + (a.correct ? 1 : 0),
    //   0,
    // );
    // const totalDelta = payloadAnswers.reduce((acc, a) => acc + a.delta, 0);

    // Insert single quiz event (idempotent)
    await client.query(
      `
      insert into xp_quiz_events
        (user_id, mode, session_key, payload, total_delta, correct_count, total_questions)
      values
        ($1, 'daily', $2, $3::jsonb, $4, $5, $6)
      on conflict (session_key) do nothing
      `,
      [
        userId,
        sessionKey,
        JSON.stringify({ answers: payloadAnswers }),
        totalDelta,
        correctCount,
        sess.total_questions,
      ],
    );

    // Complete daily session
    await client.query(
      `
      update daily_sessions
      set
        completed = true,
        answered_word_ids = $2::text[],
        answered_count = $3,
        correct_count = $4,
        xp_earned = $5,
        updated_at = now()
      where user_id = $1 and session_date = current_date
      `,
      [
        userId,
        payloadAnswers.map((a) => a.wordId),
        answeredCount,
        correctCount,
        totalDelta,
      ],
    );

    await client.query("COMMIT");

    const host =
      getHeader(event, "x-forwarded-host") ?? getHeader(event, "host");
    const proto = getHeader(event, "x-forwarded-proto") ?? "https";

    if (!host) {
      console.error("[xp-quiz] cannot trigger worker: host header missing");
    } else {
      const baseUrl = `${proto}://${host}`;

      try {
        const r = await fetch(`${baseUrl}/api/worker/xp-quiz`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        });

        if (!r.ok) {
          console.error(
            "[xp-quiz] worker trigger failed",
            r.status,
            await r.text(),
          );
        } else {
          console.log("[xp-quiz] worker trigger ok");
        }
      } catch (err) {
        console.error("[xp-quiz] worker trigger threw", err);
      }
    }

    return {
      daily: {
        answeredCount,
        correctCount,
        xpEarned: totalDelta,
        totalQuestions: sess.total_questions,
      },
      quizEvent: { sessionKey }, // handy for debugging
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});
