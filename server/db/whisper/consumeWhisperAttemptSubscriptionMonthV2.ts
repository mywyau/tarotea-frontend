import { createError } from "h3";
import { db } from "~/server/db";

interface SubscriptionMonthUsageRow {
  attempts: number;
}

interface ConsumeWhisperAttemptResult {
  attempts: number;
  remaining: number;
  limit: number;
}

export async function consumeWhisperAttemptSubscriptionMonthV2(
  userId: string,
  limit: number,
  windowStart: Date,
  windowEnd: Date,
): Promise<ConsumeWhisperAttemptResult> {
  const result = await db.query<SubscriptionMonthUsageRow>(
    `
    INSERT INTO ai_usage_subscription_month (
      user_id,
      window_start,
      window_end,
      attempts,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, 1, NOW(), NOW())

    ON CONFLICT (user_id, window_start, window_end)
    DO UPDATE
    SET
      attempts = ai_usage_subscription_month.attempts + 1,
      updated_at = NOW()
    WHERE ai_usage_subscription_month.attempts < $4

    RETURNING attempts
    `,
    [userId, windowStart.toISOString(), windowEnd.toISOString(), limit],
  );

  const [row] = result.rows;

  if (!row) {
    throw createError({
      statusCode: 429,
      statusMessage: "Monthly pronunciation limit reached",
    });
  }

  return {
    attempts: row.attempts,
    remaining: limit - row.attempts,
    limit,
  };
}