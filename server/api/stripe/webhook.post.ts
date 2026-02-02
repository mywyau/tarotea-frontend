import { createError, getHeader, readRawBody } from "h3";
import Stripe from "stripe";
import { db } from "~/server/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

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

      const userId = sub.metadata.userId;
      const plan = sub.metadata.plan;
      const customerId = typeof sub.customer === "string" ? sub.customer : null;

      if (!userId || !plan || !customerId) {
        console.error("Subscription missing data", {
          subId: sub.id,
          userId,
          plan,
          customerId,
        });
        break;
      }

      const check = await db.query(
        `select id, stripe_customer_id from users where id = $1`,
        [userId],
      );

      console.log("👀 users row seen by webhook:", check.rows);

      // ✅ ALWAYS ensure customer ID is linked
      const res = await db.query(
        `
          update users
          set stripe_customer_id = $1
          where id = $2
            and stripe_customer_id is null
        `,
        [customerId, userId],
      );

      console.log("🧩 users update rowCount:", res.rowCount);

      const active = sub.status === "active" || sub.status === "trialing";

      await db.query(
        `
          update entitlements
          set plan = $1,
              active = $2
          where user_id = $3
        `,
        [plan, active, userId],
      );
      return { received: true };
    }

    case "customer.subscription.deleted": {
      const sub = stripeEvent.data.object as Stripe.Subscription;

      const userId = sub.metadata.userId;

      if (!userId) break;

      await db.query(
        `
          update entitlements
          set plan = 'free',
              active = false
          where user_id = $1
        `,
        [userId],
      );
      return { received: true };
    }
  }

  return { received: false };
});
