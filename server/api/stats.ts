import { db } from "~/server/db"

export default defineEventHandler(async () => {
  const { rows: userRows } = await db.query(
    `SELECT COUNT(*)::int AS count FROM users`
  )

  const { rows: paidRows } = await db.query(
    `
    SELECT COUNT(*)::int AS count
    FROM entitlements
    WHERE subscription_status = 'active'
      AND plan IN ('monthly', 'yearly')
    `
  )

  return {
    totalUsers: userRows[0]?.count ?? 0,
    paidUsers: paidRows[0]?.count ?? 0,
  }
})
