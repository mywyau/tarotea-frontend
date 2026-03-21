import { createError } from "h3";
import { db } from "~/server/repositories/db";

export async function checkDailyWhisperAttempts(userId: string) {
  const { rows } = await db.query(
    `
    SELECT COUNT(*)::int AS count
    FROM ai_pronunciation_attempts
    WHERE user_id = $1
    AND created_at >= DATE_TRUNC('day', NOW())
    `,
    [userId],
  );

  const attemptsToday = rows[0]?.count ?? 0;

  if (attemptsToday >= 200) {
    throw createError({
      statusCode: 429,
      statusMessage: "Daily pronunciation limit reached",
    });
  }

  return attemptsToday;
}
