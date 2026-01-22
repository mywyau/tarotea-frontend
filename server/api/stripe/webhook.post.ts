// server/webhook.post.ts

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
      process.env.STRIPE_WEBHOOK_SIGNING_KEY!
    );
  } catch (err) {
    console.error("Webhook verification failed", err);
    throw createError({ statusCode: 400, statusMessage: "Invalid signature" });
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;

    if (!userId || !plan) {
      console.error(
        "Stripe session missing metadata",
        session.id,
        session.metadata
      );
      return { received: true };
    }

    await db.query(
    `
      update entitlements
      set plan = $1, active = true
      where user_id = $2
    `,
      [plan, userId]
    );
  }

  return { received: true };
});
