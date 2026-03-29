// server/utils/qstash.ts
import { Client, Receiver } from "@upstash/qstash";
import { createError, getHeader, type H3Event } from "h3";

export const XP_JYUTPING_QUEUE = "xp-jyutping";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw createError({
      statusCode: 500,
      statusMessage: `Missing required env var: ${name}`,
    });
  }
  return value;
}

export function getQstashClient() {
  return new Client({
    token: requireEnv("QSTASH_TOKEN"),
  });
}

export function getQstashReceiver() {
  return new Receiver({
    currentSigningKey: requireEnv("QSTASH_CURRENT_SIGNING_KEY"),
    nextSigningKey: requireEnv("QSTASH_NEXT_SIGNING_KEY"),
  });
}

export function getPublicEndpointUrl(event: H3Event): string {
  const proto = getHeader(event, "x-forwarded-proto") ?? "https";
  const host =
    getHeader(event, "x-forwarded-host") ?? getHeader(event, "host");

  if (!host) {
    throw createError({
      statusCode: 500,
      statusMessage: "Unable to resolve public host for QStash verification",
    });
  }

  return `${proto}://${host}${event.path}`;
}

export function getWorkerUrl(event: H3Event, workerPath: string): string {
  const proto = getHeader(event, "x-forwarded-proto") ?? "https";
  const host =
    getHeader(event, "x-forwarded-host") ?? getHeader(event, "host");

  if (!host) {
    throw createError({
      statusCode: 500,
      statusMessage: "Unable to resolve public host for QStash enqueue",
    });
  }

  return `${proto}://${host}${workerPath}`;
}