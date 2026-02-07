import { createError, getHeader, readBody } from "h3";
import Stripe from "stripe";
import { db } from "~/server/db";
import { requireUser } from "~/server/utils/requireUser";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export default defineEventHandler(async (event) => {
  // 🔐 Authenticated user
  const userId = await requireUser(event);

  // 👤 Fetch user email
  const { rows } = await db.query(`select email from users where id = $1`, [
    userId,
  ]);

  if (!rows[0]?.email) {
    throw createError({
      statusCode: 400,
      statusMessage: "User email not found",
    });
  }

  const userEmail = rows[0].email;

  // 📦 Request body
  const body = await readBody(event);
  const { billing } = body as { billing: "monthly" | "yearly" };

  if (billing !== "monthly" && billing !== "yearly") {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid billing option",
    });
  }

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

  const idempotencyKey = `checkout:${userId}:${billing}:${Math.floor(Date.now() / 10_000)}`;

  // 🧾 Create Checkout Session
  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",

      line_items: [{ price: priceId, quantity: 1 }],

      success_url: `${origin}/billing/success`,
      cancel_url: `${origin}/billing/cancel`,

      client_reference_id: userId,

      customer_email: userEmail, // ✅ CORRECT

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
    },
    {
      idempotencyKey: idempotencyKey,
    },
  );

  return { url: session.url };
});
