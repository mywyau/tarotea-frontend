// server/api/daily/jyutping/finalize.post.ts
import { createError, readBody } from "h3";
import {
  dailyJyutpingFailXp,
  dailyJyutpingSuccessXp,
} from "~/config/xp/helpers";
import { db } from "~/server/repositories/db";
import { queueDailyJyutpingWorker } from "~/server/utils/qstash/dailyJyutping";
import { requireUser } from "~/server/utils/requireUser";

type SessionAnswer = {
  wordId: string;
  correct: boolean;
};

type PayloadAnswer = SessionAnswer & {
  delta: number;
};

function utcDayString(d = new Date()): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dedupeAnswers(answers: SessionAnswer[]): SessionAnswer[] {
  const map = new Map<string, boolean>();

  for (const answer of answers) {
    if (!answer?.wordId) continue;

    if (!map.has(answer.wordId)) {
      map.set(answer.wordId, !!answer.correct);
    }
  }

  return [...map.entries()].map(([wordId, correct]) => ({
    wordId,
    correct,
  }));
}

function deltaFor(correct: boolean): number {
  return correct ? dailyJyutpingSuccessXp : dailyJyutpingFailXp;
}

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event);
  const userId = auth.sub;

  const body = (await readBody(event).catch(() => null)) as {
    answers?: SessionAnswer[];
  } | null;

  if (!body || !Array.isArray(body.answers)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid payload",
    });
  }

  const answers = dedupeAnswers(body.answers);

  if (answers.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "No answers",
    });
  }

  const sessionDate = utcDayString();
  const mode = "daily-jyutping";
  const sessionKey = `daily:${mode}:${sessionDate}:${userId}`;

  const client = await db.connect();

  let eventId: number | string | null = null;
  let totalQuestions = 0;
  let answeredCount = 0;
  let correctCount = 0;
  let xpEarned = 0;

  try {
    await client.query("BEGIN");

    const sessionRes = await client.query(
      `
        select
          completed,
          word_ids,
          total_questions,
          answered_count,
          correct_count,
          xp_earned
        from daily_sessions
        where user_id = $1
          and session_date = $2::date
          and mode = $3
        for update
      `,
      [userId, sessionDate, mode],
    );

    if (!sessionRes.rowCount) {
      throw createError({
        statusCode: 404,
        statusMessage: "Daily jyutping session not started",
      });
    }

    const session = sessionRes.rows[0];
    totalQuestions = session.total_questions ?? 0;

    if (session.completed) {
      await client.query("COMMIT");

      return {
        daily: {
          answeredCount: session.answered_count ?? 0,
          correctCount: session.correct_count ?? 0,
          xpEarned: session.xp_earned ?? 0,
          totalQuestions,
        },
        quizEvent: {
          sessionKey,
          eventId: null,
          queued: false,
          alreadyCompleted: true,
        },
      };
    }

    const allowedWordIds = new Set<string>(session.word_ids ?? []);
    const filtered = answers.filter((answer) =>
      allowedWordIds.has(answer.wordId),
    );

    if (filtered.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Answers do not match today's word list",
      });
    }

    const payloadAnswers: PayloadAnswer[] = filtered.map((answer) => ({
      wordId: answer.wordId,
      correct: answer.correct,
      delta: deltaFor(answer.correct),
    }));

    answeredCount = payloadAnswers.length;
    correctCount = payloadAnswers.reduce(
      (sum, answer) => sum + (answer.correct ? 1 : 0),
      0,
    );
    xpEarned = payloadAnswers.reduce((sum, answer) => sum + answer.delta, 0);

    const eventRes = await client.query(
      `
        insert into xp_jyutping_events
          (
            user_id,
            mode,
            session_key,
            payload,
            total_delta,
            correct_count,
            total_questions
          )
        values
          ($1, $2, $3, $4::jsonb, $5, $6, $7)
        on conflict (session_key)
        do update set session_key = excluded.session_key
        returning id
      `,
      [
        userId,
        mode,
        sessionKey,
        JSON.stringify({ answers: payloadAnswers }),
        xpEarned,
        correctCount,
        totalQuestions,
      ],
    );

    eventId = eventRes.rows[0]?.id ?? null;

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
        payloadAnswers.map((answer) => answer.wordId),
        answeredCount,
        correctCount,
        xpEarned,
      ],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  let queued = false;

  if (eventId != null) {
    try {
      await queueDailyJyutpingWorker({
        eventId,
        userId,
        sessionKey,
      });

      queued = true;
    } catch (error) {
      console.error("[daily-jyutping] publish failed", {
        eventId,
        userId,
        sessionKey,
        error,
      });
    }
  }

  return {
    daily: {
      answeredCount,
      correctCount,
      xpEarned,
      totalQuestions,
    },
    quizEvent: {
      sessionKey,
      eventId,
      queued,
    },
  };
});
