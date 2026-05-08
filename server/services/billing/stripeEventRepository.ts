import type Stripe from "stripe";
import { db } from "~/server/repositories/db";

type InsertStripeEventResult = {
  inserted: boolean;
  eventId: string;
  eventType: string;
  status: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  userId: string | null;
};

function extractStripeSubscriptionId(stripeEvent: Stripe.Event): string | null {
  const obj = stripeEvent.data.object as any;

  if (typeof obj?.subscription === "string") {
    return obj.subscription;
  }

  if (obj?.object === "subscription" && typeof obj?.id === "string") {
    return obj.id;
  }

  const parent = obj?.parent;
  if (
    parent?.type === "subscription_details" &&
    typeof parent?.subscription_details?.subscription === "string"
  ) {
    return parent.subscription_details.subscription;
  }

  const firstLine = obj?.lines?.data?.[0];
  if (
    typeof firstLine?.parent?.subscription_item_details?.subscription ===
    "string"
  ) {
    return firstLine.parent.subscription_item_details.subscription;
  }

  return null;
}

function extractStripeCustomerId(stripeEvent: Stripe.Event): string | null {
  const obj = stripeEvent.data.object as any;

  if (typeof obj?.customer === "string") {
    return obj.customer;
  }

  return null;
}

function extractUserId(stripeEvent: Stripe.Event): string | null {
  const obj = stripeEvent.data.object as any;

  if (typeof obj?.metadata?.userId === "string") {
    return obj.metadata.userId;
  }

  if (typeof obj?.client_reference_id === "string") {
    return obj.client_reference_id;
  }

  return null;
}

export async function insertStripeEvent(
  stripeEvent: Stripe.Event,
): Promise<InsertStripeEventResult> {
  const stripeSubscriptionId = extractStripeSubscriptionId(stripeEvent);
  const stripeCustomerId = extractStripeCustomerId(stripeEvent);
  const userId = extractUserId(stripeEvent);
  const stripeCreatedAt = new Date(stripeEvent.created * 1000).toISOString();

  const result = await db.query<InsertStripeEventResult>(
    `
      with inserted as (
        insert into stripe_events (
          event_id,
          event_type,
          stripe_created_at,
          received_at,
          status,
          payload,
          stripe_subscription_id,
          stripe_customer_id,
          user_id
        )
        values (
          $1,
          $2,
          $3,
          now(),
          'received',
          $4::jsonb,
          $5,
          $6,
          $7
        )
        on conflict (event_id) do nothing
        returning
          true as inserted,
          event_id as "eventId",
          event_type as "eventType",
          status,
          stripe_subscription_id as "stripeSubscriptionId",
          stripe_customer_id as "stripeCustomerId",
          user_id as "userId"
      )
      select * from inserted
      union all
      select
        false as inserted,
        event_id as "eventId",
        event_type as "eventType",
        status,
        stripe_subscription_id as "stripeSubscriptionId",
        stripe_customer_id as "stripeCustomerId",
        user_id as "userId"
      from stripe_events
      where event_id = $1
        and not exists (select 1 from inserted)
      limit 1
    `,
    [
      stripeEvent.id,
      stripeEvent.type,
      stripeCreatedAt,
      JSON.stringify(stripeEvent),
      stripeSubscriptionId,
      stripeCustomerId,
      userId,
    ],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error(`Failed to insert or load Stripe event ${stripeEvent.id}`);
  }

  return row;
}
