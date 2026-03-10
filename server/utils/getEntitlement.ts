import { db } from "~/server/db";

export async function getUserEntitlement(userId: string) {
  const { rows } = await db.query(
    `
    SELECT plan, subscription_status, current_period_end
    FROM entitlements
    WHERE user_id = $1
    LIMIT 1
    `,
    [userId]
  )

  return rows[0] ?? null
}