import { createError, getHeader, readRawBody } from "h3";
import Stripe from "stripe";
import { db } from "~/server/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";

interface Entitlement {
  plan: "free" | "monthly" | "yearly";
  subscription_status: SubscriptionStatus;
  active: boolean;
  cancel_at_period_end: boolean;

  current_period_end?: string;
  canceled_at?: string;
}

function entitlementFromSubscription(sub: Stripe.Subscription): Entitlement {

  const item = sub.items?.data?.[0];

  const active =
    sub.status === "active" ||
    sub.status === "trialing" ||
    sub.status === "past_due";

  return {
    plan: (sub.metadata.plan as "monthly" | "yearly") ?? "free",
    subscription_status: sub.status as SubscriptionStatus,
    active,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,

    ...(item?.current_period_end && {
      current_period_end: new Date(
        item.current_period_end * 1000,
      ).toISOString(),
    }),

    ...(sub.canceled_at && {
      canceled_at: new Date(sub.canceled_at * 1000).toISOString(),
    }),
  };
}

export default defineEventHandler(async (event) => {
  const sig = getHeader(event, "stripe-signature");
  const body = await readRawBody(event);

  if (!sig || !body) {
    throw createError({ statusCode: 400, statusMessage: "Missing signature" });
  }

  let stripeEvent: Stripe.Event;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SIGNING_KEY!,
    );
  } catch (err) {
    console.error("Webhook verification failed", err);
    throw createError({ statusCode: 400, statusMessage: "Invalid signature" });
  }

  console.log("🔥 Stripe webhook received");
  console.log("Event type:", stripeEvent.type);

  switch (stripeEvent.type) {
    case "checkout.session.completed": {
      const session = stripeEvent.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? session.metadata?.userId;

      const customerId =
        typeof session.customer === "string" ? session.customer : null;

      if (!userId || !customerId) {
        console.error("Checkout missing data", {
          sessionId: session.id,
          userId,
          customerId,
        });
        break;
      }

      // ✅ Link Stripe customer to user
      await db.query(
        `
          update users
          set stripe_customer_id = $1
          where id = $2
        `,
        [customerId, userId],
      );

      return { received: true };
    }
    case "customer.subscription.created": // 👇 this block runs for BOTH events for creation and  customer.subscription.updated": since there is no break;
    case "customer.subscription.updated": {
      const sub = stripeEvent.data.object as Stripe.Subscription;

      const customerId = typeof sub.customer === "string" ? sub.customer : null;

      if (!customerId) break;

      const userRes = await db.query(
        `select id from users where stripe_customer_id = $1`,
        [customerId],
      );

      if (userRes.rowCount === 0) {
        console.error("No user for Stripe customer", customerId);
        break;
      }

      const userId = userRes.rows[0].id;

      const e = entitlementFromSubscription(sub);

      await db.query(
        `
          update entitlements
          set
            plan = $1,
            subscription_status = $2,
            active = $3,
            cancel_at_period_end = $4,
            current_period_end = $5,
            canceled_at = $6
          where user_id = $7
        `,
        [
          e.plan,
          e.subscription_status,
          e.active,
          e.cancel_at_period_end,
          e.current_period_end,
          e.canceled_at,
          userId,
        ],
      );

      return { received: true };
    }
    case "customer.subscription.deleted": {
      const sub = stripeEvent.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : null;

      if (!customerId) {
        console.error("Deleted subscription missing customer");
        break;
      }

      const userRes = await db.query(
        `select id from users where stripe_customer_id = $1`,
        [customerId],
      );

      if (userRes.rowCount === 0) {
        console.error("No user for Stripe customer", customerId);
        break;
      }

      const userId = userRes.rows[0].id;

      await db.query(
        `
          update entitlements
          set
            plan = 'free',
            subscription_status = 'canceled',
            active = false,
            cancel_at_period_end = false,
            current_period_end = null,
            canceled_at = now()
          where user_id = $1
        `,
        [userId],
      );

      return { received: true };
    }
  }

  return { received: false };
});
