import { createError, getHeader, readRawBody } from "h3";
import Stripe from "stripe";
import { enqueueStripeEventJob } from "~/server/services/billing/stripeEnqueueHelper";
import { insertStripeEvent } from "~/server/services/billing/stripeEventRepository";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function shouldQueueStripeEvent(status: string): boolean {
  return status === "received" || status === "failed";
}

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

    if (!result.inserted && !shouldQueueStripeEvent(result.status)) {
      console.log("[STRIPE_V2] Duplicate event ignored", {
        requestId,
        eventId: stripeEvent.id,
        eventType: stripeEvent.type,
        status: result.status,
      });

      return {
        received: true,
        duplicate: true,
        status: result.status,
      };
    }

    await enqueueStripeEventJob(event, {
      eventId: result.eventId,
      stripeSubscriptionId: result.stripeSubscriptionId,
      stripeCustomerId: result.stripeCustomerId,
    });

    console.log("[STRIPE_V2] Event queued", {
      requestId,
      eventId: result.eventId,
      eventType: result.eventType,
      inserted: result.inserted,
      previousStatus: result.status,
      stripeSubscriptionId: result.stripeSubscriptionId,
      stripeCustomerId: result.stripeCustomerId,
      userId: result.userId,
    });

    return {
      received: true,
      queued: true,
      duplicate: !result.inserted,
    };
  } catch (error) {
    console.error("[STRIPE_V2] Failed to persist or queue Stripe event", {
      requestId,
      eventId: stripeEvent.id,
      eventType: stripeEvent.type,
      error,
    });

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to persist or queue Stripe event",
    });
  }
});