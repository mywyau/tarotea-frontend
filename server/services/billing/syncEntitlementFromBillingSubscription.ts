import { db } from "~/server/repositories/db";

type BillingSubscriptionRow = {
  user_id: string;
  plan: string;
  subscription_status: string;
  cancel_at_period_end: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
};

function toEntitlementPlan(
  subscriptionStatus: string,
  plan: string,
): "free" | "monthly" | "yearly" {
  const hasPaidAccess =
    subscriptionStatus === "active" || subscriptionStatus === "trialing";

  if (!hasPaidAccess) {
    return "free";
  }

  if (plan === "monthly" || plan === "yearly") {
    return plan;
  }

  throw new Error(`Invalid billing plan for entitlement sync: ${plan}`);
}

export async function syncEntitlementFromBillingSubscription(
  billingSubscription: BillingSubscriptionRow,
) {
  const entitlementPlan = toEntitlementPlan(
    billingSubscription.subscription_status,
    billingSubscription.plan,
  );

  await db.query(
    `
      insert into entitlements (
        user_id,
        plan,
        subscription_status,
        cancel_at_period_end,
        current_period_start,
        current_period_end,
        canceled_at
      )
      values ($1, $2, $3, $4, $5, $6, $7)
      on conflict (user_id)
      do update set
        plan = excluded.plan,
        subscription_status = excluded.subscription_status,
        cancel_at_period_end = excluded.cancel_at_period_end,
        current_period_start = excluded.current_period_start,
        current_period_end = excluded.current_period_end,
        canceled_at = excluded.canceled_at
    `,
    [
      billingSubscription.user_id,
      entitlementPlan,
      billingSubscription.subscription_status,
      billingSubscription.cancel_at_period_end,
      billingSubscription.current_period_start,
      billingSubscription.current_period_end,
      billingSubscription.canceled_at,
    ],
  );
}
