const FREE_TOPICS = new Set([
  "survival-essentials",
  "greetings-polite",
  "fruits-vegetables",
  "clothing",
  "measure-quantities",
]);

export default defineNuxtRouteMiddleware(async (to) => {
  const topic = to.params.topic as string | undefined;
  if (!topic) return;

  const { authReady, resolve, hasPaidAccess } = useMeStateV2();

  if (!authReady.value) {
    await resolve();
  }

  // ✅ Free topics always allowed
  if (FREE_TOPICS.has(topic)) {
    return;
  }

  console.log(hasPaidAccess.value);
  // 🔒 Premium required
  if (!hasPaidAccess.value) {
    return navigateTo("/upgrade", { replace: true });
  }
});
