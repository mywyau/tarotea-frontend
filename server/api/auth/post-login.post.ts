// server/api/auth/post-login.post.ts

import { readBody, createError } from 'h3'
import { db } from '~/server/db'

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

  try {
    // 1️⃣ Create user if they don't exist
    await db.query(
      `
      insert into users (id, email)
      values ($1, $2)
      on conflict (id) do nothing
      `,
      [userId, email]
    )

    // 2️⃣ Create default entitlement if missing
    await db.query(
      `
      insert into entitlements (user_id, plan, active)
      values ($1, 'free', true)
      on conflict (user_id) do nothing
      `,
      [userId]
    )

    // 3️⃣ Fetch combined user + entitlement state
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

    if (rows.length === 0) {
      throw new Error('User creation failed')
    }

    return rows[0]
  } catch (err) {
    console.error('[post-login]', err)

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to process login'
    })
  }
})
