import { Client as QStashClient } from "@upstash/qstash";

export async function queueXpQuizWorker() {
  
  const runtimeConfig = useRuntimeConfig();

  const qstash = new QStashClient({
    token: runtimeConfig.qstashToken,
  });

  await qstash.publishJSON({
    url: `${runtimeConfig.public.siteUrl}/api/worker/xp-quiz`,
    body: {},
    retries: 3,
  });
}