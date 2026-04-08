import { requireUser } from "@/server/utils/requireUser";
import { createError, setHeader } from "h3";
import { db } from "~/server/repositories/db";
import { enforceRateLimit } from "../utils/rate-limiting/rateLimit";

type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";

interface Entitlement {
  plan: "free" | "monthly" | "yearly";
  subscription_status: SubscriptionStatus;
  cancel_at_period_end: boolean;
  current_period_end?: string;
  canceled_at?: string;
}

interface MeResponse {
  id: string;
  email: string;
  entitlement: Entitlement;
}

export default defineEventHandler(async (event): Promise<MeResponse> => {
  setHeader(event, "Cache-Control", "private, no-store");

  const authUser = await requireUser(event);
  const userId = authUser.sub;

  await enforceRateLimit(`rl:me:${userId}`, 120, 60);

  console.log(
    JSON.stringify({
      event: "[meV2.get.ts][defineEventHandler] - meV2_endpoint_called",
      userId,
      timestamp: new Date().toISOString(),
    }),
  );

  const { rows } = await db.query(
    `
      select
        u.id,
        u.email,
        e.plan,
        e.subscription_status,
        e.current_period_start,
        e.current_period_end,
        e.cancel_at_period_end,
        e.canceled_at
      from users u
      left join entitlements e on e.user_id = u.id
      where u.id = $1
    `,
    [userId],
  );

  const row = rows[0];

  if (!row) {
    console.error(
      JSON.stringify({
        event: "me_user_not_found",
        userId,
      }),
    );
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  const entitlement: Entitlement = row?.plan
    ? {
        plan: row.plan,
        subscription_status: row.subscription_status,
        cancel_at_period_end: row.cancel_at_period_end,
        ...(row.current_period_end && {
          current_period_end: new Date(row.current_period_end).toISOString(),
        }),
        ...(row.canceled_at && {
          canceled_at: new Date(row.canceled_at).toISOString(),
        }),
      }
    : {
        plan: "free",
        subscription_status: "canceled",
        cancel_at_period_end: false,
      };

  return {
    id: row.id,
    email: row.email,
    entitlement,
  };
});
