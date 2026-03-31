// server/api/stripe/webhook-v2.post.ts

import { createError, getHeader, readRawBody } from "h3";
import Stripe from "stripe";
import { insertStripeEvent } from "~/server/services/billing/stripeEventRepository";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;


export default defineEventHandler(async (event) => {
  const requestId = crypto.randomUUID();

  const signature = getHeader(event, "stripe-signature");
  const rawBody = await readRawBody(event);

  if (!signature || !rawBody) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing Stripe signature or request body",
    });
  }

  if (!webhookSecret) {
    console.error("[STRIPE_V2] Missing STRIPE_WEBHOOK_SECRET", { requestId });

    throw createError({
      statusCode: 500,
      statusMessage: "Stripe webhook secret not configured",
    });
  }

  let stripeEvent: Stripe.Event;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.error("[STRIPE_V2] Webhook signature verification failed", {
      requestId,
      error,
    });

    throw createError({
      statusCode: 400,
      statusMessage: "Invalid Stripe signature",
    });
  }

  try {
    const result = await insertStripeEvent(stripeEvent);

    if (!result.inserted) {
      console.log("[STRIPE_V2] Duplicate event ignored", {
        requestId,
        eventId: stripeEvent.id,
        eventType: stripeEvent.type,
      });

      return {
        received: true,
        duplicate: true,
      };
    }

    console.log("[STRIPE_V2] Event stored", {
      requestId,
      eventId: stripeEvent.id,
      eventType: stripeEvent.type,
    });

    return {
      received: true,
    };
  } catch (error) {
    console.error("[STRIPE_V2] Failed to persist Stripe event", {
      requestId,
      eventId: stripeEvent.id,
      eventType: stripeEvent.type,
      error,
    });

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to persist Stripe event",
    });
  }
});