import { createError, getHeader, readBody } from "h3";
import { db } from "~/server/db";
import { requireUser } from "~/server/utils/requireUser";
import {
  dailyJyutpingFailXp,
  dailyJyutpingSuccessXp,
} from "~/utils/xp/helpers";

type SessionAnswer = {
  wordId: string;
  correct: boolean;
};

function utcDayString(d = new Date()): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default defineEventHandler(async (event) => {
  console.log("[finalize][dailyJyutping] quiz");

  const userId = await requireUser(event);
  const body = (await readBody(event)) as { answers: SessionAnswer[] };

  if (!body || !Array.isArray(body.answers)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid payload" });
  }

  const sessionDate = utcDayString();
  const mode = "daily-jyutping";

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
    // 🔒 Lock today's jyutping session
    const sessRes = await client.query(
      `
      select completed, word_ids, total_questions
      from daily_sessions
      where user_id = $1
        and session_date = $2::date
        and mode = $3
      for update
      `,
      [userId, sessionDate, mode],
    );

    if (!sessRes.rowCount) {
      throw createError({
        statusCode: 404,
        statusMessage: "Daily jyutping session not started",
      });
    }

    const sess = sessRes.rows[0];

    const sessionKey = `daily:${mode}:${sessionDate}:${userId}`;

    // 🛑 Idempotent return if already completed
    if (sess.completed) {
      const snap = await client.query(
        `
        select answered_count, correct_count, xp_earned, total_questions
        from daily_sessions
        where user_id = $1
          and session_date = $2::date
          and mode = $3
        `,
        [userId, sessionDate, mode],
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

    // ✅ Validate answers belong to today
    const allowed = new Set(sess.word_ids ?? []);
    const filtered = answers.filter((a) => allowed.has(a.wordId));

    if (filtered.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Answers do not match today's word list",
      });
    }

    function deltaFor(correct: boolean) {
      if (!correct) return dailyJyutpingFailXp;
      return dailyJyutpingSuccessXp;
    }

    const payloadAnswers = filtered.map((a) => {
      return {
        wordId: a.wordId,
        correct: a.correct,
        delta: deltaFor(a.correct),
      };
    });

    const answeredCount = payloadAnswers.length;
    const correctCount = payloadAnswers.reduce(
      (acc, a) => acc + (a.correct ? 1 : 0),
      0,
    );
    const totalDelta = payloadAnswers.reduce((acc, a) => acc + a.delta, 0);

    // 📝 Insert XP event (idempotent)
    await client.query(
      `
      insert into xp_jyutping_events
        (user_id, mode, session_key, payload, total_delta, correct_count, total_questions)
      values
        ($1, $2, $3, $4::jsonb, $5, $6, $7)
      on conflict (session_key) do nothing
      `,
      [
        userId,
        mode,
        sessionKey,
        JSON.stringify({ answers: payloadAnswers }),
        totalDelta,
        correctCount,
        sess.total_questions,
      ],
    );

    // 🏁 Complete session
    await client.query(
      `
      update daily_sessions
      set
        completed = true,
        answered_word_ids = $4::text[],
        answered_count = $5,
        correct_count = $6,
        xp_earned = $7,
        updated_at = now()
      where user_id = $1
        and session_date = $2::date
        and mode = $3
      `,
      [
        userId,
        sessionDate,
        mode,
        payloadAnswers.map((a) => a.wordId),
        answeredCount,
        correctCount,
        totalDelta,
      ],
    );

    await client.query("COMMIT");

    // 🔥 Trigger worker
    const host =
      getHeader(event, "x-forwarded-host") ?? getHeader(event, "host");
    const proto = getHeader(event, "x-forwarded-proto") ?? "https";

    if (host) {
      fetch(`${proto}://${host}/api/worker/xp-jyutping`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => {});
    }

    return {
      daily: {
        answeredCount,
        correctCount,
        xpEarned: totalDelta,
        totalQuestions: sess.total_questions,
      },
      quizEvent: { sessionKey },
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});
