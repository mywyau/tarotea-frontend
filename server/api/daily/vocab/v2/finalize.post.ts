import { createError, defineEventHandler, readBody } from "h3";
import { db } from "~/server/repositories/db";
import {
  DAILY_MODE,
  buildDailySessionKey,
  dailyDeltaFor,
  dedupeAnswers,
  getUtcDayKey,
} from "~/server/utils/dailyQuiz";
import { queueXpQuizWorker } from "~/server/utils/queueXpQuizWorker";
import { requireUser } from "~/server/utils/requireUser";

type Body = {
  answers?: Array<{ wordId: string; correct: boolean }>;
  mode?: string;
};

type DailySessionRow = {
  completed: boolean;
  word_ids: string[];
  total_questions: number;
  session_date: string;
  answered_count: number;
  correct_count: number;
  xp_earned: number;
};

type StreakRow = {
  word_id: string;
  streak: number;
};

type EventRow = {
  processed: boolean;
};

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event);
  const userId = auth.sub;
  const body = (await readBody(event)) as Body;

  const mode = body.mode ?? DAILY_MODE;
  if (mode !== DAILY_MODE) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid mode",
    });
  }

  const answers = dedupeAnswers(body.answers);

  if (!answers.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "No answers",
    });
  }

  const utcDayKey = getUtcDayKey();
  const client = await db.connect();

  let sessionKey = "";
  let attemptId = "";
  let shouldQueueWorker = false;

  let responsePayload: {
    daily: {
      answeredCount: number;
      correctCount: number;
      xpEarned: number;
      totalQuestions: number;
    };
    status: "processing" | "completed";
    quizEvent: { sessionKey: string; attemptId: string };
  };

  try {
    await client.query("BEGIN");

    const sessRes = await client.query<DailySessionRow>(
      `
      select
        completed,
        word_ids,
        total_questions,
        session_date::text,
        answered_count,
        correct_count,
        xp_earned
      from daily_sessions
      where user_id = $1
        and session_date = $2::date
        and mode = $3
      for update
      `,
      [userId, utcDayKey, mode],
    );

    if (!sessRes.rowCount) {
      throw createError({
        statusCode: 404,
        statusMessage: "Daily session not started",
      });
    }

    const sess = sessRes.rows[0];
    sessionKey = buildDailySessionKey(mode, sess.session_date, userId);
    attemptId = sessionKey;

    if (sess.completed) {
      const existingEventRes = await client.query<EventRow>(
        `
        select processed
        from xp_quiz_events
        where user_id = $1
          and attempt_id = $2
        limit 1
        `,
        [userId, attemptId],
      );

      const existingEvent = existingEventRes.rows[0];
      const processed = !!existingEvent?.processed;
      const eventExists = !!existingEvent;

      shouldQueueWorker = eventExists && !processed;

      responsePayload = {
        daily: {
          answeredCount: sess.answered_count ?? 0,
          correctCount: sess.correct_count ?? 0,
          xpEarned: sess.xp_earned ?? 0,
          totalQuestions: sess.total_questions ?? 0,
        },
        status: processed ? "completed" : "processing",
        quizEvent: { sessionKey, attemptId },
      };

      await client.query("COMMIT");
    } else {
      const allowed = new Set(sess.word_ids ?? []);
      const filtered = answers.filter((answer) => allowed.has(answer.wordId));

      if (filtered.length !== sess.total_questions) {
        throw createError({
          statusCode: 400,
          statusMessage: "Answers do not match today's full word list",
        });
      }

      const streakRes = await client.query<StreakRow>(
        `
        select word_id, streak
        from user_word_progress
        where user_id = $1
          and word_id = any($2::text[])
        `,
        [userId, filtered.map((answer) => answer.wordId)],
      );

      const streakMap = new Map<string, number>();
      for (const row of streakRes.rows) {
        streakMap.set(row.word_id, Number(row.streak ?? 0));
      }

      const payloadAnswers = filtered.map((answer) => {
        const streakBefore = streakMap.get(answer.wordId) ?? 0;

        return {
          wordId: answer.wordId,
          correct: answer.correct,
          delta: dailyDeltaFor(answer.correct, streakBefore),
        };
      });

      const answeredCount = payloadAnswers.length;
      const correctCount = payloadAnswers.reduce(
        (sum, answer) => sum + (answer.correct ? 1 : 0),
        0,
      );
      const totalDelta = payloadAnswers.reduce(
        (sum, answer) => sum + answer.delta,
        0,
      );

      await client.query(
        `
        insert into xp_quiz_events
          (
            user_id,
            mode,
            session_key,
            attempt_id,
            payload,
            total_delta,
            correct_count,
            total_questions
          )
        values
          ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
        on conflict (session_key) do nothing
        `,
        [
          userId,
          mode,
          sessionKey,
          attemptId,
          JSON.stringify({ answers: payloadAnswers }),
          totalDelta,
          correctCount,
          sess.total_questions,
        ],
      );

      shouldQueueWorker = true;

      await client.query(
        `
        update daily_sessions
        set
          completed = true,
          answered_word_ids = $3::text[],
          answered_count = $4,
          correct_count = $5,
          xp_earned = $6,
          updated_at = now()
        where user_id = $1
          and session_date = $2::date
          and mode = $7
        `,
        [
          userId,
          utcDayKey,
          payloadAnswers.map((answer) => answer.wordId),
          answeredCount,
          correctCount,
          totalDelta,
          mode,
        ],
      );

      responsePayload = {
        daily: {
          answeredCount,
          correctCount,
          xpEarned: totalDelta,
          totalQuestions: sess.total_questions,
        },
        status: "processing",
        quizEvent: { sessionKey, attemptId },
      };

      await client.query("COMMIT");
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  if (shouldQueueWorker) {
    try {
      await queueXpQuizWorker({
        attemptId,
        userId,
      });
    } catch (error) {
      console.error("[daily-submit] failed to queue xp worker", error);
    }
  }

  return responsePayload;
});
