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
  cancel_at_period_end: boolean;

  current_period_end?: string;
  canceled_at?: string;
}

function entitlementFromSubscription(sub: Stripe.Subscription): Entitlement {
  const item = sub.items?.data?.[0];

  // 👇 Stripe-safe interpretation
  const cancelAtPeriodEnd =
    sub.cancel_at_period_end ||
    (sub.cancel_at && sub.cancel_at * 1000 > Date.now());

  return {
    plan: (sub.metadata.plan as "monthly" | "yearly") ?? "free",
    subscription_status: sub.status as SubscriptionStatus,
    cancel_at_period_end: Boolean(cancelAtPeriodEnd),

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

function getSubscriptionIdFromInvoiceLines(
  invoice: Stripe.Invoice,
): string | null {
  const line = invoice.lines?.data?.[0] as any;

  return typeof line?.parent?.subscription_item_details?.subscription ===
    "string"
    ? line.parent.subscription_item_details.subscription
    : null;
}

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent as any;

  if (
    parent?.type === "subscription_details" &&
    typeof parent?.subscription_details?.subscription === "string"
  ) {
    return parent.subscription_details.subscription;
  }

  return null;
}

function extractSubscriptionId(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent as any;

  if (
    parent?.type === "subscription_details" &&
    typeof parent?.subscription_details?.subscription === "string"
  ) {
    return parent.subscription_details.subscription;
  }

  const line = invoice.lines?.data?.[0] as any;

  if (
    typeof line?.parent?.subscription_item_details?.subscription === "string"
  ) {
    return line.parent.subscription_item_details.subscription;
  }

  return null;
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
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("Webhook verification failed", err);
    throw createError({ statusCode: 400, statusMessage: "Invalid signature" });
  }

  switch (stripeEvent.type) {
    // case "invoice.paid": {
    //   // this is the event when stripe finishes and fires a status which is "active" or not
    //   // subscription updated will often be set to "incomplete"

    //   const invoice = stripeEvent.data.object as Stripe.Invoice;

    //   const subId =
    //     typeof invoice.subscription === "string" ? invoice.subscription : null;

    //   if (!subId) break;

    //   const sub = await stripe.subscriptions.retrieve(subId);

    //   if (sub.status === "canceled") break;

    //   const userId = sub.metadata?.userId;
    //   if (!userId) break;

    //   const e = entitlementFromSubscription(sub);

    //   await db.query(
    //     `
    //       update entitlements
    //       set
    //         plan = $1,
    //         subscription_status = $2,
    //         active = true,
    //         cancel_at_period_end = $3,
    //         current_period_end = $4,
    //         canceled_at = $5
    //       where user_id = $6
    //     `,
    //     [
    //       e.plan,
    //       e.subscription_status,
    //       e.cancel_at_period_end,
    //       e.current_period_end,
    //       e.canceled_at,
    //       userId,
    //     ],
    //   );

    //   return { received: true };
    // }

    case "invoice.paid": {
      const invoice = stripeEvent.data.object as Stripe.Invoice;

      const subId = extractSubscriptionId(invoice);
      if (!subId) break;

      const sub = await stripe.subscriptions.retrieve(subId);
      if (sub.status === "canceled") break;

      const userId = sub.metadata?.userId;
      if (!userId) break;

      const e = entitlementFromSubscription(sub);

      await db.query(
        `
      update entitlements
      set
        plan = $1,
        subscription_status = $2,
        active = true,
        cancel_at_period_end = $3,
        current_period_end = $4,
        canceled_at = $5
      where user_id = $6
    `,
        [
          e.plan,
          e.subscription_status,
          e.cancel_at_period_end,
          e.current_period_end,
          e.canceled_at,
          userId,
        ],
      );

      return { received: true };
    }
    case "invoice.payment_failed": {
      const invoice = stripeEvent.data.object as Stripe.Invoice;
      const subId =
        typeof invoice.subscription === "string" ? invoice.subscription : null;
      if (!subId) break;

      const sub = await stripe.subscriptions.retrieve(subId);
      const userId = sub.metadata?.userId;
      if (!userId) break;

      await db.query(
        `
          update entitlements
          set active = false
          where user_id = $1
        `,
        [userId],
      );

      return { received: true };
    }
    case "customer.subscription.created": // 👇 this block runs for BOTH events for creation and  customer.subscription.updated": since there is no break;
    case "customer.subscription.updated": {
      const sub = stripeEvent.data.object as Stripe.Subscription;

      const userId = sub.metadata?.userId;

      if (!userId) {
        console.error("Subscription missing userId metadata", sub.id);
        break;
      }

      const e = entitlementFromSubscription(sub);

      await db.query(
        `
        UPDATE entitlements
          SET
            plan = $1,
            subscription_status = $2,
            cancel_at_period_end = $3,
            current_period_end = $4,
            canceled_at = $5
          WHERE user_id = $6
        `,
        [
          e.plan,
          e.subscription_status,
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

      const userId = sub.metadata?.userId;

      if (!userId) {
        console.error("Subscription missing userId metadata", sub.id);
        break;
      }

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
    case "checkout.session.completed": {
      const session = stripeEvent.data.object as Stripe.Checkout.Session;

      const userId = session.client_reference_id;
      const customerId =
        typeof session.customer === "string" ? session.customer : null;

      if (!userId || !customerId) break;

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
  }

  return { received: false };
});
