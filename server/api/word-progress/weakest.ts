import { getQuery, createError } from "h3"
import { db } from "~/server/db"
import { requireUser } from "~/server/utils/requireUser"

export default defineEventHandler(async (event) => {
  const userId = await requireUser(event)

  const query = getQuery(event)
  const levelSlug = query.level

  if (!levelSlug || typeof levelSlug !== "string") {
    throw createError({ statusCode: 400, statusMessage: "level required" })
  }

  const { rows } = await db.query(
    `
    select
      w.id,
      coalesce(p.xp, 0) as xp
    from words w
    left join user_word_progress p
      on w.id = p.word_id
      and p.user_id = $1
    where w.level_slug = $2
    order by coalesce(p.xp, 0) asc
    `,
    [userId, levelSlug]
  )

  return rows
})
