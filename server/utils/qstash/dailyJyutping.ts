import { Client as QStashClient } from "@upstash/qstash";

type QueueDailyJyutpingWorkerInput = {
  eventId: number | string;
  userId: string;
  sessionKey: string;
};

export async function queueDailyJyutpingWorker(
  input: QueueDailyJyutpingWorkerInput,
) {
  const runtimeConfig = useRuntimeConfig();

  const qstash = new QStashClient({
    token: runtimeConfig.qstashToken,
  });

  await qstash.publishJSON({
    url: `${runtimeConfig.public.siteUrl}/api/daily/jyutping/v2/xp-worker`,
    body: {
      eventId: input.eventId,
      userId: input.userId,
      sessionKey: input.sessionKey,
    },
    retries: 3,
  });
}