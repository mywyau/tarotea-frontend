import { db } from "~/server/db";
import { requireUser } from "~/server/utils/requireUser";

export default defineEventHandler(async (event) => {
  const userId = await requireUser(event);

  // 1️⃣ Check if today's session exists
  const sessionResult = await db.query(
    `
    select completed, xp_earned, correct_count, total_questions
    from daily_sessions
    where user_id = $1
      and session_date = current_date
    `,
    [userId],
  );

  let completed = false;
  let xpEarnedToday = 0;

  // 2️⃣ If no session → create one
  if (sessionResult.rowCount === 0) {
    await db.query(
      `
      insert into daily_sessions (user_id, session_date)
      values ($1, current_date)
      `,
      [userId],
    );
  } else {
    completed = sessionResult.rows[0].completed;
    xpEarnedToday = sessionResult.rows[0].xp_earned;
  }

  // 3️⃣ If already completed → return early
  if (completed) {
    return {
      completed: true,
      xpEarnedToday,
      correctCount: sessionResult.rows[0]?.correct_count ?? 0,
      totalQuestions: sessionResult.rows[0]?.total_questions ?? 0,
      words: [],
    };
  }

  const DAILY_QUESTION_LIMIT = 20;

  // 4️⃣ Fetch weakest words (your existing logic)
  const wordsResult = await db.query(
    `
    select
      w.id,
      w.word,
      w.meaning
    from user_word_progress p
    join words w on w.id = p.word_id
    where p.user_id = $1
    order by
      p.xp asc,
      p.wrong_count desc,
      p.last_seen_at asc
    limit $2
    `,
    [userId, DAILY_QUESTION_LIMIT],
  );

  return {
    completed: false,
    xpEarnedToday,
    correctCount: sessionResult.rows[0]?.correct_count ?? 0,
    totalQuestions: sessionResult.rows[0]?.total_questions ?? 0,
    words: wordsResult.rows,
  };
});
