import { useRuntimeConfig } from "#imports";
import { Receiver } from "@upstash/qstash";
import { createError, getHeader, type H3Event } from "h3";

export async function verifyQuizWorkerRequest(
  event: H3Event,
  rawBody: string,
  path: string,
): Promise<void> {
  const config = useRuntimeConfig(event);

  const currentSigningKey = config.qstashCurrentSigningKey as
    | string
    | undefined;
  const nextSigningKey = config.qstashNextSigningKey as string | undefined;
  const appBaseUrl = config.public.siteUrl as string | undefined;

  if (!currentSigningKey || !nextSigningKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Missing QStash signing keys",
    });
  }

  if (!appBaseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: "Missing public.siteUrl",
    });
  }

  const signature = getHeader(event, "Upstash-Signature");

  if (!signature) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing Upstash signature",
    });
  }

  const receiver = new Receiver({
    currentSigningKey,
    nextSigningKey,
  });

  const workerUrl = `${appBaseUrl.replace(/\/+$/, "")}${path}`;

  const isValid = await receiver.verify({
    signature,
    body: rawBody,
    url: workerUrl,
  }).catch(() => false);

  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid Upstash signature",
    });
  }
}
