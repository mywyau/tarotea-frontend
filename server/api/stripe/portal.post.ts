import Stripe from "stripe";

// import Stripe from 'stripe'
import { getAuthenticatedUserFromDB } from "~/server/utils/getAuthenticatedUserFromDB";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE!, {
    apiVersion: "2023-10-16",
  });

  const user = await getAuthenticatedUserFromDB(event);

  if (!user?.stripeCustomerId) {
    throw createError({ statusCode: 401 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${config.public.siteUrl}/account`,
  });

  return { url: session.url };
});
