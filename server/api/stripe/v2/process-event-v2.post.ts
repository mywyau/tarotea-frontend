// server/api/stripe/process-event-v2.post.ts

// this is the worker ot process the stripe events I think

import { createError, readBody } from "h3";
import { processStripeEvent } from "~/server/services/billing/processStripeEvent";

type Body = {
  eventId?: string;
};

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event);
  const eventId = body?.eventId;

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing eventId",
    });
  }

  const result = await processStripeEvent(eventId);

  if (!result.ok) {
    throw createError({
      statusCode: 500,
      statusMessage: result.message,
      data: result,
    });
  }

  return result;
});