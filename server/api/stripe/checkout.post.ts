// server/checkout.post.ts

import { createError, getHeader, readBody } from "h3";
import Stripe from "stripe";
import { requireUser } from "~/server/utils/requireUser";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export default defineEventHandler(async (event) => {
  // 🔐 Authenticated user
  const userId = await requireUser(event);

  // 📦 Request body
  const body = await readBody(event);
  const { billing } = body as { billing: "monthly" | "yearly" };

  if (billing !== "monthly" && billing !== "yearly") {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid billing option",
    });
  }

  // 🌍 Base URL (required by Stripe)
  //   const baseUrl = process.env.PUBLIC_BASE_URL;
  //   if (!baseUrl) {
  //     throw createError({
  //       statusCode: 500,
  //       statusMessage: "PUBLIC_BASE_URL not configured",
  //     });
  //   }

  // 🔑 Lookup key from env
  const lookupKey =
    billing === "monthly"
      ? process.env.STRIPE_PRICE_MONTHLY
      : process.env.STRIPE_PRICE_YEARLY;

  if (!lookupKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Stripe price lookup key missing",
    });
  }

  // 💳 Resolve lookup key → actual price ID
  const prices = await stripe.prices.list({
    lookup_keys: [lookupKey],
    limit: 1,
  });

  if (!prices.data.length) {
    throw createError({
      statusCode: 500,
      statusMessage: `No Stripe price found for ${lookupKey}`,
    });
  }

  const priceId = prices.data[0].id;

  const origin =
    getHeader(event, "origin") || `https://${getHeader(event, "host")}`;

  if (!origin) {
    throw createError({
      statusCode: 500,
      statusMessage: "Unable to determine origin",
    });
  }

  // 🧾 Create Checkout Session

  // const session = await stripe.checkout.sessions.create({
  //   mode: "subscription",

  //   line_items: [
  //     {
  //       price: priceId,
  //       quantity: 1,
  //     },
  //   ],

  //   success_url: `${origin}/billing/success`,
  //   cancel_url: `${origin}/billing/cancel`,

  //   // 🔗 Link Stripe → your user
  //   client_reference_id: userId,
  //   metadata: {
  //     userId,
  //     plan: billing, // 'monthly' | 'yearly'
  //   },
  // });

  // 🧾 Create Checkout Session
  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      // customer_creation: "always", // 👈 FORCE customer creation - not needed since we are using subscription mode

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      success_url: `${origin}/billing/success`,
      cancel_url: `${origin}/billing/cancel`,

      client_reference_id: userId,

      metadata: {
        userId,
        plan: billing,
      },

      subscription_data: {
        metadata: {
          userId,
          plan: billing,
        },
      },
    }
    // { idempotencyKey: `checkout:${userId}:${billing}` }
  );

  return {
    url: session.url,
  };
});
