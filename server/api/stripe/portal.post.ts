import Stripe from "stripe";
import { useAuth } from "~/composables/useAuth";
import { useMeState } from "~/composables/useMeState";

// export default defineEventHandler(async (event) => {

//   const config = useRuntimeConfig();

//   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//     apiVersion: "2023-10-16",
//   });

//   // 🔐 Get user from session (adjust to your auth)
//   const { me } = await useAuth(event);

//   if (!me || !me.stripeCustomerId) {
//     throw createError({
//       statusCode: 401,
//       statusMessage: "Not authenticated",
//     });
//   }

//   const session = await stripe.billingPortal.sessions.create({
//     customer: me.stripeCustomerId,
//     return_url: `${config.public.siteUrl}/account`,
//   });

//   return {
//     url: session.url,
//   };
// });

// import Stripe from 'stripe'
import { useServerAuth } from '~/server/utils/useServerAuth'

export default defineEventHandler(async (event) => {

  const config = useRuntimeConfig()

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16'
  })

  const { user } = await useServerAuth(event)

  if (!user?.stripeCustomerId) {
    throw createError({ statusCode: 401 })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${config.public.siteUrl}/account`
  })

  return { url: session.url }
})

