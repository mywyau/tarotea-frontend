import { createError } from "h3";
import { db } from "~/server/db";
import { requireUser } from "~/server/utils/requireUser";

const MONTHLY_LIMIT = 5000;

export default defineEventHandler(async (event) => {
  const userId = await requireUser(event);

  const { rows } = await db.query(
    `
    SELECT attempts
    FROM ai_usage_monthly
    WHERE user_id = $1
    AND month = DATE_TRUNC('month', NOW())::date
    `,
    [userId]
  );

  const attempts = rows[0]?.attempts ?? 0;

  return {
    attempts: attempts,
    remaining: MONTHLY_LIMIT - attempts,
    limit: MONTHLY_LIMIT,
  };
});