import { db } from "~/server/db";
import { getUserEntitlement } from "~/server/utils/getEntitlement";
import { requireUser } from "~/server/utils/requireUser";

export default defineEventHandler(async (event) => {
  
  const userId = await requireUser(event);
  const entitlement = await getUserEntitlement(userId);

  const isPaid =
    entitlement &&
    entitlement.subscription_status === "active" &&
    ["monthly", "yearly"].includes(entitlement.plan);

  const limit = isPaid ? 5000 : 10;

  const { rows } = await db.query(
    `
    SELECT attempts
    FROM ai_usage_monthly
    WHERE user_id = $1
      AND month = DATE_TRUNC('month', NOW())::date
    `,
    [userId],
  );

  const attempts = rows[0]?.attempts ?? 0;

  return {
    attempts,
    remaining: Math.max(limit - attempts, 0),
    limit,
  };
});
