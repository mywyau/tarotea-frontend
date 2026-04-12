// server/repositories/whisper/consumeWhisperAttemptMonthlyBySubject.ts
import { db } from "~/server/repositories/db"
import { createError } from "h3"

export async function consumeWhisperAttemptMonthlyBySubject(
  subjectKey: string,
  limit: number,
) {
  const result = await db.query<{
    attempts: number
  }>(
    `
    insert into ai_usage_monthly_subject (subject_key, month, attempts)
    values ($1, date_trunc('month', now())::date, 1)
    on conflict (subject_key, month)
    do update
      set attempts = ai_usage_monthly_subject.attempts + 1,
          updated_at = now()
    returning attempts
    `,
    [subjectKey],
  )

  const attempts = Number(result.rows[0]?.attempts ?? 0)

  if (attempts > limit) {
    throw createError({
      statusCode: 429,
      statusMessage: "Monthly pronunciation limit reached",
    })
  }

  return {
    attempts,
    remaining: Math.max(limit - attempts, 0),
  }
}