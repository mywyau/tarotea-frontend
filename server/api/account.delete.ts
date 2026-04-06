// import { createError, defineEventHandler } from "h3";
// import Stripe from "stripe";

// import { getUserFromSession } from "@/server/utils/auth";
// import { deleteAuth0User } from "@/server/utils/auth0";
// import { deleteUserData } from "@/server/utils/deleteUserData";
// import { db } from "~/server/repositories/db";

// export default defineEventHandler(async (event) => {
//   // 1️⃣ Authenticate
//   const user = await getUserFromSession(event);

//   if (!user) {
//     throw createError({
//       statusCode: 401,
//       statusMessage: "Unauthenticated",
//     });
//   }

//   // 2️⃣ Idempotency guard
//   if (user.deletingAt) {
//     throw createError({
//       statusCode: 409,
//       statusMessage: "Account deletion already in progress",
//     });
//   }

//   // 3️⃣ Set deletion lock (INTENT)
//   await db.query(`UPDATE users SET deleting_at = NOW() WHERE id = $1`, [
//     user.id,
//   ]);

//   try {
//     // 4️⃣ Cancel Stripe subscriptions
//     if (user.stripeCustomerId) {
//       const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//         apiVersion: "2023-10-16",
//       });

//       const subs = await stripe.subscriptions.list({
//         customer: user.stripeCustomerId,
//         status: "active",
//       });

//       for (const sub of subs.data) {
//         if (sub.status !== "canceled") {
//           await stripe.subscriptions.cancel(sub.id);
//         }
//       }
//     }

//     // 5️⃣ Delete app-level data (must be inside try)
//     await deleteUserData(user.id);
//   } catch (err) {
//     // 🔴 CLEAR LOCK ON ANY FAILURE
//     await db.query(`UPDATE users SET deleting_at = NULL WHERE id = $1`, [
//       user.id,
//     ]);

//     throw err;
//   }

//   // 6️⃣ Delete Auth0 user (soft fail is OK)
//   try {
//     await deleteAuth0User(user.id);
//   } catch (err) {
//     console.error("Auth0 deletion failed", {
//       userId: user.id,
//       error: err,
//     });
//   }

//   // 7️⃣ Done
//   return { success: true };
// });
