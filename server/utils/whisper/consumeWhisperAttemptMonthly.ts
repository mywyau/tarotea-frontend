import { createError } from "h3";
import { db } from "~/server/db";

const MONTHLY_LIMIT = 6000; // example

export async function consumeWhisperAttemptMonthly(userId: string,): Promise<{ attempts: number; remaining: number }> {
  const { rows } = await db.query(
    `
    INSERT INTO ai_usage_monthly (user_id, month, attempts)
    VALUES ($1, DATE_TRUNC('month', NOW())::date, 1)

    ON CONFLICT (user_id, month)
    DO UPDATE
    SET attempts = ai_usage_monthly.attempts + 1
    WHERE ai_usage_monthly.attempts < $2

    RETURNING attempts
    `,
    [userId, MONTHLY_LIMIT],
  );

  if (rows.length === 0) {
    throw createError({
      statusCode: 429,
      statusMessage: "Monthly AI pronunciation limit reached",
    });
  }

  return {
    attempts: rows[0].attempts,
    remaining: MONTHLY_LIMIT - rows[0].attempts,
  };
}
