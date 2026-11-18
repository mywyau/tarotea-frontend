// server/api/stripe/portal.post.ts

import { createError } from "h3";
import { db } from "~/server/repositories/db";
import { stripe } from "~/server/services/billing/stripeClient";
import { BILLING_SESSION_RATE_LIMIT } from "~/server/utils/rate-limiting/policies";
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit";
import { requireUser } from "~/server/utils/requireUser";

function getAppUrl(): string {
  const appUrl = process.env.SITE_URL?.trim();

  if (!appUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: "APP_URL is not configured",
    });
  }

  return appUrl.replace(/\/+$/, "");
}

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event);
  const userId = auth.sub;

  await enforceRateLimit(
    `rl:billing-session:user:${userId}`,
    BILLING_SESSION_RATE_LIMIT.limit,
    BILLING_SESSION_RATE_LIMIT.windowSeconds,
  );

  const { rows } = await db.query<{ stripeCustomerId: string | null }>(
    `
      select stripe_customer_id as "stripeCustomerId"
      from users
      where id = $1
      limit 1
    `,
    [userId],
  );
  const user = rows[0];

  if (!user?.stripeCustomerId) {
    throw createError({
      statusCode: 400,
      statusMessage: "No Stripe customer found for user",
    });
  }

  const appUrl = getAppUrl();

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/account/v2`,
  });

  return { url: session.url };
});
