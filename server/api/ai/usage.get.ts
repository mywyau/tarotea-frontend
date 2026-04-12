import { setHeader } from "h3";
import { db } from "~/server/repositories/db";
import { getUserEntitlement } from "~/server/utils/getEntitlement";
import { requireUser } from "~/server/utils/requireUser";
import { getPronunciationUsageSubject } from "~/server/utils/whisper/getPronunciationUsageSubject";
import { whisperRequestLimit, whisperRequestLimitFree } from "~/utils/whisper";

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "private, no-store");

  const auth = await requireUser(event);
  const userId = auth.sub;
  const entitlement = await getUserEntitlement(userId);

  const isPaid =
    entitlement &&
    entitlement.subscription_status === "active" &&
    ["monthly", "yearly"].includes(entitlement.plan);

  const limit = isPaid ? whisperRequestLimit : whisperRequestLimitFree;
  const subject = getPronunciationUsageSubject(event, auth, !!isPaid);

  let attempts = 0;

  if (isPaid) {
    const windowStart = entitlement.current_period_start;
    const windowEnd = entitlement.current_period_end;

    const { rows } = await db.query(
      `
      SELECT attempts
      FROM ai_usage_subscription_month
      WHERE user_id = $1
        AND window_start = $2
        AND window_end = $3
      `,
      [userId, windowStart, windowEnd],
    );

    attempts = rows[0]?.attempts ?? 0;
  } else {
    const { rows } = await db.query(
      `
  select attempts
  from ai_usage_monthly_subject
  where subject_key = $1
    and month = date_trunc('month', now())::date
  `,
      [subject.key],
    );

    attempts = rows[0]?.attempts ?? 0;
  }

  return {
    attempts,
    remaining: Math.max(limit - attempts, 0),
    limit,
  };
});
