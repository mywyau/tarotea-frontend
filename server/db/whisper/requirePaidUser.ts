import { createError } from "h3"
import { db } from "~/server/db"

export async function requirePaidUser(userId: string) {

  const { rows } = await db.query(
    `
    SELECT plan, subscription_status, current_period_end
    FROM entitlements
    WHERE user_id = $1
    LIMIT 1
    `,
    [userId]
  )

  const entitlement = rows[0]

  if (!entitlement) {
    throw createError({
      statusCode: 403,
      statusMessage: "Subscription required",
    })
  }

  const now = new Date()
  const periodEnd = entitlement.current_period_end
    ? new Date(entitlement.current_period_end)
    : null

  const isActive =
    entitlement.subscription_status === "active" &&
    ["monthly", "yearly"].includes(entitlement.plan) &&
    (!periodEnd || periodEnd > now)

  if (!isActive) {
    throw createError({
      statusCode: 403,
      statusMessage: "Pro subscription required",
    })
  }

  return entitlement
}