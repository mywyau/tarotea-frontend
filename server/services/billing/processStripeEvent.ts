import type Stripe from "stripe";
import { db } from "~/server/repositories/db";
import { getBillingSubscriptionByStripeSubscriptionId } from "~/server/services/billing/getBillingSubscriptionByStripeSubscriptionId";
import { syncEntitlementFromBillingSubscription } from "~/server/services/billing/syncEntitlementFromBillingSubscription";
import { upsertBillingSubscription } from "~/server/services/billing/upsertBillingSubscription";

type ProcessStripeEventResult =
  | { ok: true; alreadyProcessed: true }
  | { ok: true; alreadyProcessing: true }
  | { ok: true; processed: true; eventType: string }
  | { ok: false; failed: true; eventType?: string; message: string };

type StripeEventRow = {
  event_id: string;
  event_type: string;
  status: string;
  payload: Stripe.Event;
};

async function markStripeEventProcessing(
  eventId: string,
): Promise<"claimed" | "already_processed" | "already_processing" | "missing"> {
  const { rows } = await db.query<{ status: string }>(
    `
      update stripe_events
      set
        status = 'processing',
        error_message = null
      where event_id = $1
        and status in ('received', 'failed')
      returning status
    `,
    [eventId],
  );

  if (rows[0]) {
    return "claimed";
  }

  const existing = await db.query<{ status: string }>(
    `
      select status
      from stripe_events
      where event_id = $1
      limit 1
    `,
    [eventId],
  );

  const status = existing.rows[0]?.status;

  if (!status) return "missing";
  if (status === "processed") return "already_processed";
  if (status === "processing") return "already_processing";

  return "missing";
}

async function markStripeEventProcessed(eventId: string) {
  await db.query(
    `
      update stripe_events
      set
        status = 'processed',
        processed_at = now(),
        error_message = null
      where event_id = $1
    `,
    [eventId],
  );
}

async function markStripeEventFailed(eventId: string, message: string) {
  await db.query(
    `
      update stripe_events
      set
        status = 'failed',
        error_message = $2
      where event_id = $1
    `,
    [eventId, message],
  );
}

function isSupportedStripeEventType(eventType: string): boolean {
  switch (eventType) {
    case "checkout.session.completed":
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "invoice.paid":
    case "invoice.payment_failed":
      return true;
    default:
      return false;
  }
}

function isSubscriptionEventType(eventType: string): boolean {
  switch (eventType) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return true;
    default:
      return false;
  }
}

export async function processStripeEvent(
  eventId: string,
): Promise<ProcessStripeEventResult> {
  const claimResult = await markStripeEventProcessing(eventId);

  if (claimResult === "already_processed") {
    return {
      ok: true,
      alreadyProcessed: true,
    };
  }

  if (claimResult === "already_processing") {
    return {
      ok: true,
      alreadyProcessing: true,
    };
  }

  if (claimResult === "missing") {
    return {
      ok: false,
      failed: true,
      message: `Stripe event not found: ${eventId}`,
    };
  }

  const { rows } = await db.query(
    `
      select event_id, event_type, status, payload
      from stripe_events
      where event_id = $1
      limit 1
    `,
    [eventId],
  );

  const row = rows[0] as StripeEventRow | undefined;

  if (!row) {
    return {
      ok: false,
      failed: true,
      message: `Stripe event not found after claim: ${eventId}`,
    };
  }

  const stripeEvent = row.payload;
  const eventType = stripeEvent.type;

  try {
    if (!isSupportedStripeEventType(eventType)) {
      await markStripeEventProcessed(eventId);

      return {
        ok: true,
        processed: true,
        eventType,
      };
    }

    if (isSubscriptionEventType(eventType)) {
      const subscription = stripeEvent.data.object as Stripe.Subscription;

      await upsertBillingSubscription(subscription);

      const billingSubscription =
        await getBillingSubscriptionByStripeSubscriptionId(subscription.id);

      if (!billingSubscription) {
        throw new Error(
          `Billing subscription not found after upsert: ${subscription.id}`,
        );
      }

      await syncEntitlementFromBillingSubscription(billingSubscription);
    }

    await markStripeEventProcessed(eventId);

    return {
      ok: true,
      processed: true,
      eventType,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown processing error";

    await markStripeEventFailed(eventId, message);

    return {
      ok: false,
      failed: true,
      eventType,
      message,
    };
  }
}