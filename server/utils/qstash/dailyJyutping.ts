import { Client as QStashClient } from "@upstash/qstash";
import { createQstashDeduplicationId } from "~/server/utils/qstash/deduplication";

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
    deduplicationId: createQstashDeduplicationId(
      "daily-jyutping",
      input.userId,
      input.eventId,
    ),
    flowControl: {
      key: "xp-daily-jyutping-v2",
      parallelism: 20,
      rate: 800,
      period: "1m",
    },
  });
}
