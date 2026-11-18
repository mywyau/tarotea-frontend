import { Client as QStashClient } from "@upstash/qstash";
import { createQstashDeduplicationId } from "~/server/utils/qstash/deduplication";

type QueueXpQuizWorkerInput = {
  attemptId: string;
  userId: string;
};

export async function queueXpQuizWorker(input: QueueXpQuizWorkerInput) {
  const runtimeConfig = useRuntimeConfig();

  const qstash = new QStashClient({
    token: runtimeConfig.qstashToken,
  });

  await qstash.publishJSON({
    url: `${runtimeConfig.public.siteUrl}/api/worker/xp-quiz-v5`,
    body: {
      attemptId: input.attemptId,
      userId: input.userId,
    },
    retries: 3,
    deduplicationId: createQstashDeduplicationId(
      "daily-vocab",
      input.userId,
      input.attemptId,
    ),
    flowControl: {
      key: "quiz-finalize-vocab",
      parallelism: 20,
      rate: 2000,
      period: "1m",
    },
  });
}
