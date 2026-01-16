import { db } from '~/server/db'
import { getHeader, createError } from 'h3'

export default defineEventHandler(async (event) => {
    
  // 🚨 TEMP: trust client for now (we’ll secure this next)
  const userId = getHeader(event, 'x-user-id')

  if (!userId) {
    return null
  }

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
