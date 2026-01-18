import Stripe from 'stripe'
import { readBody, createError } from 'h3'
import { requireUser } from '~/server/utils/requireUser'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export default defineEventHandler(async (event) => {
  // 🔐 Authenticated user
  const userId = await requireUser(event)

  // 📦 Request body
  const body = await readBody(event)
  const { billing } = body as { billing: 'monthly' | 'yearly' }

  if (billing !== 'monthly' && billing !== 'yearly') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid billing option'
    })
  }

  // 🌍 Base URL (required by Stripe)
  const baseUrl = process.env.PUBLIC_BASE_URL
  if (!baseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'PUBLIC_BASE_URL not configured'
    })
  }

  // 🔑 Lookup key from env
  const lookupKey =
    billing === 'monthly'
      ? process.env.STRIPE_PRICE_MONTHLY
      : process.env.STRIPE_PRICE_YEARLY

  if (!lookupKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Stripe price lookup key missing'
    })
  }

  // 💳 Resolve lookup key → actual price ID
  const prices = await stripe.prices.list({
    lookup_keys: [lookupKey],
    limit: 1
  })

  if (!prices.data.length) {
    throw createError({
      statusCode: 500,
      statusMessage: `No Stripe price found for ${lookupKey}`
    })
  }

  const priceId = prices.data[0].id

  // 🧾 Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',

    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],

    success_url: `${baseUrl}/upgrade/success`,
    cancel_url: `${baseUrl}/upgrade/cancel`,

    // 🔗 Link Stripe → your user
    client_reference_id: userId,
    metadata: {
      userId
    }
  })

  return {
    url: session.url
  }
})
