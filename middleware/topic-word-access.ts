export default defineNuxtRouteMiddleware(async (to) => {
  const topic = to.params.topic as string | undefined;
  if (!topic) return;

  const { authReady, hasPaidAccess, resolve } = useMeStateV2();

  if (!authReady.value) {
    await resolve();
  }

  const FREE_TOPICS = [
    "survival-essentials",
    "greetings-polite",
    "fruits-vegetables",
    "clothing",
    // "measure-quantities"
  ];

  // ✅ Free topics
  if (FREE_TOPICS.includes(topic)) {
    return;
  }

  // 🔒 Premium required
  if (!hasPaidAccess.value) {
    return navigateTo("/upgrade", { replace: true });
  }
});
