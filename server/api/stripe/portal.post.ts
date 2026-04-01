// server/api/stripe/portal.post.ts

import { createError } from "h3";
import { stripe } from "~/server/services/billing/stripeClient";
import { getAuthenticatedUserFromDB } from "~/server/utils/getAuthenticatedUserFromDB";

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
  const user = await getAuthenticatedUserFromDB(event);

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  if (!user.stripeCustomerId) {
    throw createError({
      statusCode: 400,
      statusMessage: "No Stripe customer found for user",
    });
  }

  const appUrl = getAppUrl();

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/account`,
  });

  return { url: session.url };
});