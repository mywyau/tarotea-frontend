import { createHash } from "node:crypto";
import { useRuntimeConfig } from "#imports";
import { Client } from "@upstash/qstash";
import type { H3Event } from "h3";

let client: Client | undefined;

export async function publishWordQuizXp(
  event: H3Event,
  job: { userId: string; attemptId: string },
) {
  const config = useRuntimeConfig(event);
  if (!config.qstashToken || !config.public.siteUrl) {
    throw new Error("Missing vocabulary XP queue configuration");
  }
  client ??= new Client({ token: config.qstashToken });
  const key = createHash("sha256").update(JSON.stringify([job.userId, job.attemptId])).digest("hex");
  return client.publishJSON({
    url: `${config.public.siteUrl.replace(/\/+$/, "")}/api/worker/xp-quiz-v5`,
    body: job,
    retries: 3,
    deduplicationId: `word-quiz-${key}`,
    flowControl: { key: "quiz-finalize-vocab", parallelism: 20, rate: 2000, period: "1m" },
  });
}
