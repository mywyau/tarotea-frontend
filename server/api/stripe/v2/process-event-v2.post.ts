// server/api/stripe/v2/process-event-v2.post.ts

import { createError, getHeader, readRawBody } from "h3";
import { Receiver } from "@upstash/qstash";
import { processStripeEvent } from "~/server/services/billing/processStripeEvent";

const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;


if (!currentSigningKey || !nextSigningKey) {
  throw new Error("Missing QStash signing keys");
}

const receiver = new Receiver({
  currentSigningKey,
  nextSigningKey,
});

type Body = {
  eventId?: string;
};

export default defineEventHandler(async (event) => {
  const signature = getHeader(event, "upstash-signature");
  const upstashRegion = getHeader(event, "upstash-region") ?? undefined;
  const rawBody = await readRawBody(event);

  if (!signature || !rawBody) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing QStash signature or body",
    });
  }

  const protocol =
    getHeader(event, "x-forwarded-proto") ??
    (process.env.NODE_ENV === "development" ? "http" : "https");
  const host = getHeader(event, "x-forwarded-host") ?? getHeader(event, "host");

  if (!host) {
    throw createError({
      statusCode: 500,
      statusMessage: "Missing host header",
    });
  }

  const url = `${protocol}://${host}${event.path}`;

  const isValid = await receiver.verify({
    signature,
    body: rawBody,
    url,
    upstashRegion,
  });

  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid QStash signature",
    });
  }

  const body = JSON.parse(rawBody) as Body;
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