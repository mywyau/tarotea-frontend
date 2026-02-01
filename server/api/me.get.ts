import { db } from "~/server/db"
import { requireUser } from "@/server/utils/requireUser"

export default defineEventHandler(async (event) => {
  
  const userId = await requireUser(event)

  const { rows } = await db.query(
    `
    select
      u.id,
      u.email,
      e.plan,
      e.active
    from users u
    join entitlements e on e.user_id = u.id
    where u.id = $1
    `,
    [userId]
  )

  return rows[0] ?? null
})
