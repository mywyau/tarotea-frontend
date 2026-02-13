const FREE_TOPICS = new Set([
  "survival-essentials",
  "greetings-polite",
  "fruits-vegetables",
  "clothing",
]);

export default defineNuxtRouteMiddleware(async (to) => {
  const topic = to.params.topic as string | undefined;
  if (!topic) return;

  const { authReady, resolve, entitlement } = useMeStateV2();

  if (!authReady.value) {
    return
    // await resolve();
  }

  // ✅ Free topics always allowed
  if (FREE_TOPICS.has(topic)) {
    return;
  }

  if (!authReady.value) return;
  
  if (!canAccessLevel(entitlement.value!)) {
    return navigateTo("/upgrade");
  }
});
