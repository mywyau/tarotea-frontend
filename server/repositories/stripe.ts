import type Stripe from "stripe"
import { db } from "~/server/repositories/db"

export async function insertStripeEvent(stripeEvent: Stripe.Event) {
  const obj = stripeEvent.data.object as any

  const stripeSubscriptionId =
    typeof obj?.subscription === "string"
      ? obj.subscription
      : typeof obj?.id === "string" && obj?.object === "subscription"
        ? obj.id
        : null

  const stripeCustomerId =
    typeof obj?.customer === "string"
      ? obj.customer
      : null

  const stripeCreatedAt = stripeEvent.created
    ? new Date(stripeEvent.created * 1000).toISOString()
    : null

  const result = await db.query(
    `
      insert into stripe_events (
        event_id,
        event_type,
        stripe_created_at,
        payload,
        stripe_subscription_id,
        stripe_customer_id,
        status
      )
      values ($1, $2, $3, $4::jsonb, $5, $6, 'received')
      on conflict (event_id) do nothing
      returning event_id
    `,
    [
      stripeEvent.id,
      stripeEvent.type,
      stripeCreatedAt,
      JSON.stringify(stripeEvent),
      stripeSubscriptionId,
      stripeCustomerId,
      null,
    ],
  )

  return {
    inserted: result.rowCount === 1,
  }
}