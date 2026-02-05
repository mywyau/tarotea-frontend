import { createError, defineEventHandler } from "h3";
import Stripe from "stripe";

import { getUserFromSession } from "@/server/utils/auth";
import { deleteAuth0User } from "@/server/utils/auth0";
import { deleteUserData } from "@/server/utils/deleteUserData";

export default defineEventHandler(async (event) => {
  // 1️⃣ Get authenticated user
  const user = await getUserFromSession(event);

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthenticated",
    });
  }

  // 2️⃣ Cancel Stripe subscriptions (if customer exists)
  if (user.stripeCustomerId) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2023-10-16",
    });

    try {
      const subs = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "active",
      });

      for (const sub of subs.data) {
        await stripe.subscriptions.del(sub.id);
      }
    } catch (err) {
      console.error("Stripe cancellation failed", {
        userId: user.id,
        stripeCustomerId: user.stripeCustomerId,
        error: err,
      });

      // 🔴 FAIL HARD — STOP ACCOUNT DELETION
      throw createError({
        statusCode: 503,
        statusMessage:
          "We couldn’t cancel your subscription right now. Please try again in a moment.",
      });
    }
  }

  // 3️⃣ Delete app-level data
  await deleteUserData(user.id);

  // 4️⃣ Delete Auth0 user
  await deleteAuth0User(user.id);

  // 5️⃣ Done
  return { success: true };
});
