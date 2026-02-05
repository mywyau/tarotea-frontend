// server/api/auth/post-login.post.ts

import { readBody, createError } from 'h3'
import { db } from '~/server/db' // adjust to your DB client

type PostLoginBody = {
  sub: string
  email: string
}

export default defineEventHandler(async (event) => {
  
  const body = await readBody<PostLoginBody>(event)

  if (!body?.sub || !body?.email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing user identity'
    })
  }

  const userId = body.sub
  const email = body.email

  // 1️⃣ Create user if not exists
  await db.query(
    `
    INSERT INTO users (id, email, created_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (id) DO NOTHING
    `,
    [userId, email]
  )

  // 2️⃣ Create entitlement if not exists
  await db.query(
    `
    INSERT INTO entitlements (user_id, plan, active)
    VALUES ($1, 'free', true)
    ON CONFLICT (user_id) DO NOTHING
    `,
    [userId]
  )

  // 3️⃣ Fetch combined user state
  const { rows } = await db.query(
    `
    SELECT
      u.id,
      u.email,
      e.plan,
      e.active
    FROM users u
    JOIN entitlements e ON e.user_id = u.id
    WHERE u.id = $1
    `,
    [userId]
  )

  return rows[0]
})
