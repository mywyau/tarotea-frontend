import { setHeader } from "h3";
import { db } from "~/server/repositories/db";
import { getUserEntitlement } from "~/server/utils/getEntitlement";
import { requireUser } from "~/server/utils/requireUser";

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "private, no-store");

  const userId = await requireUser(event);
  const entitlement = await getUserEntitlement(userId);

  const isActivePaid =
    entitlement &&
    entitlement.subscription_status === "active" &&
    ["monthly", "yearly"].includes(entitlement.plan);

  let attempts = 0;
  let limit = 10;

  if (!isActivePaid) {
    // Free tier: still calendar month if that is your rule
    const { rows } = await db.query(
      `
      SELECT attempts
      FROM ai_usage_monthly
      WHERE user_id = $1
        AND month = DATE_TRUNC('month', NOW())::date
      `,
      [userId],
    );

    attempts = rows[0]?.attempts ?? 0;
    limit = 10;
  } else if (entitlement.plan === "monthly") {
    limit = 5000;

    const windowStart = entitlement.current_period_start;
    const windowEnd = entitlement.current_period_end;

    const { rows } = await db.query(
      `
      SELECT attempts
      FROM ai_usage_subscription_month
      WHERE user_id = $1
        AND window_start = $2
        AND window_end = $3
      `,
      [userId, windowStart, windowEnd],
    );

    attempts = rows[0]?.attempts ?? 0;
  } else if (entitlement.plan === "yearly") {
    limit = 5000; // or whatever yearly limit really is

    const windowStart = entitlement.current_period_start;
    const windowEnd = entitlement.current_period_end;

    const { rows } = await db.query(
      `
      SELECT attempts
      FROM ai_usage_subscription_year
      WHERE user_id = $1
        AND window_start = $2
        AND window_end = $3
      `,
      [userId, windowStart, windowEnd],
    );

    attempts = rows[0]?.attempts ?? 0;
  }

  return {
    attempts,
    remaining: Math.max(limit - attempts, 0),
    limit,
  };
});