import { createError } from "h3"
import { db } from "~/server/db"
import { requireUser } from "~/server/utils/requireUser"

export default defineEventHandler(async (event) => {
  const userId = await requireUser(event)

  const result = await db.query(
    `
    select
      w.id,
      w.word,
      w.meaning,
      coalesce(p.xp, 0) as xp
    from words w
    join user_word_progress p
      on w.id = p.word_id
      and p.user_id = $1
    order by
      coalesce(p.xp, 0) asc,
      coalesce(p.wrong_count, 0) desc,
      coalesce(p.last_seen_at, '1970-01-01') asc
    limit 10
    `,
    [userId]
  )

  return result.rows
})
