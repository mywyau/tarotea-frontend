import Stripe from 'stripe'
import { db } from '~/server/db'
import { getHeader, readRawBody, createError } from 'h3'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export default defineEventHandler(async (event) => {
  const sig = getHeader(event, 'stripe-signature')
  const body = await readRawBody(event)

  if (!sig || !body) {
    throw createError({ statusCode: 400, statusMessage: 'Missing signature' })
  }

  let stripeEvent: Stripe.Event

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook verification failed', err)
    throw createError({ statusCode: 400, statusMessage: 'Invalid signature' })
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.Checkout.Session

    const userId = session.client_reference_id
    if (!userId) {
      throw createError({ statusCode: 400, statusMessage: 'Missing user reference' })
    }

    await db.query(
      `
      update entitlements
      set plan = 'pro', active = true
      where user_id = $1
      `,
      [userId]
    )
  }

  return { received: true }
})
