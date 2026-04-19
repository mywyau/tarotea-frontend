import { Client as QStashClient } from "@upstash/qstash";

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
  });
}