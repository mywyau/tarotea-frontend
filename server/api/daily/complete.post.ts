import { readBody } from "h3";
import { db } from "~/server/db";
import { requireUser } from "~/server/utils/requireUser";

export default defineEventHandler(async (event) => {
  const userId = await requireUser(event);
  const body = await readBody(event);

  const { xpEarned, correctCount, totalQuestions } = body;

  await db.query(
    `
    update daily_sessions
    set completed = true,
        xp_earned = $2,
        correct_count = $3,
        total_questions = $4,
        updated_at = now()
    where user_id = $1
      and session_date = current_date
    `,
    [userId, xpEarned, correctCount, totalQuestions]
  );

  return { success: true };
});
