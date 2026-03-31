import { db } from "~/server/repositories/db";

export type BillingSubscriptionRow = {
  stripe_subscription_id: string;
  user_id: string;
  stripe_customer_id: string;
  plan: string;
  subscription_status: string;
  cancel_at_period_end: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  latest_invoice_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function getBillingSubscriptionByStripeSubscriptionId(
  stripeSubscriptionId: string,
): Promise<BillingSubscriptionRow | null> {
  const { rows } = await db.query(
    `
      select
        stripe_subscription_id,
        user_id,
        stripe_customer_id,
        plan,
        subscription_status,
        cancel_at_period_end,
        current_period_start,
        current_period_end,
        canceled_at,
        latest_invoice_id,
        created_at,
        updated_at
      from billing_subscriptions
      where stripe_subscription_id = $1
      limit 1
    `,
    [stripeSubscriptionId],
  );

  return (rows[0] as BillingSubscriptionRow | undefined) ?? null;
}