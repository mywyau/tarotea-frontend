import { createError } from "h3";
import { db } from "~/server/db";

export async function consumeWhisperAttempt(userId: string) {
  const { rows } = await db.query(
    `
    INSERT INTO ai_usage_daily (user_id, day, attempts)
    VALUES ($1, CURRENT_DATE, 1)

    ON CONFLICT (user_id, day)
    DO UPDATE
    SET attempts = ai_usage_daily.attempts + 1
    WHERE ai_usage_daily.attempts < 200

    RETURNING attempts
    `,
    [userId]
  );

  if (rows.length === 0) {
    throw createError({
      statusCode: 429,
      statusMessage: "Daily pronunciation limit reached",
    });
  }

  return rows[0].attempts;
}