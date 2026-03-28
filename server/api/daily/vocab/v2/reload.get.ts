import { createError, defineEventHandler, getQuery } from "h3";
import { db } from "~/server/repositories/db";
import { requireUser } from "~/server/utils/requireUser";
import {
  DAILY_MODE,
  buildDailySessionKey,
  getUtcDayKey,
} from "~/server/utils/dailyQuiz";

type DailySessionRow = {
  completed: boolean;
  session_date: string;
  answered_count: number;
  correct_count: number;
  xp_earned: number;
  total_questions: number;
};

type EventRow = {
  processed: boolean;
  processed_at: string | null;
};

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event);
  const userId = auth.sub;

  const query = getQuery(event);
  const mode =
    typeof query.mode === "string" && query.mode.trim()
      ? query.mode
      : DAILY_MODE;

  const utcDayKey = getUtcDayKey();

  const sessRes = await db.query<DailySessionRow>(
    `
    select
      completed,
      session_date::text,
      answered_count,
      correct_count,
      xp_earned,
      total_questions
    from daily_sessions
    where user_id = $1
      and session_date = $2::date
      and mode = $3
    limit 1
    `,
    [userId, utcDayKey, mode],
  );

  if (!sessRes.rowCount) {
    throw createError({
      statusCode: 404,
      statusMessage: "Daily session not found",
    });
  }

  const sess = sessRes.rows[0];

  if (!sess.completed) {
    return {
      dailyCompleted: false,
      status: "in_progress" as const,
      daily: {
        answeredCount: sess.answered_count ?? 0,
        correctCount: sess.correct_count ?? 0,
        xpEarned: sess.xp_earned ?? 0,
        totalQuestions: sess.total_questions ?? 0,
      },
    };
  }

  const sessionKey = buildDailySessionKey(mode, sess.session_date, userId);

  const eventRes = await db.query<EventRow>(
    `
    select processed, processed_at::text
    from xp_quiz_events
    where session_key = $1
    limit 1
    `,
    [sessionKey],
  );

  const processed = !!eventRes.rows[0]?.processed;

  return {
    dailyCompleted: true,
    status: processed ? "completed" : "processing",
    daily: {
      answeredCount: sess.answered_count ?? 0,
      correctCount: sess.correct_count ?? 0,
      xpEarned: sess.xp_earned ?? 0,
      totalQuestions: sess.total_questions ?? 0,
    },
    quizEvent: {
      sessionKey,
      processed,
      processedAt: eventRes.rows[0]?.processed_at ?? null,
    },
  };
});