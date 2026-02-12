export default defineNuxtRouteMiddleware(async (to) => {
  const topic = to.params.topic as string | undefined;
  if (!topic) return;

  const { authReady, hasPaidAccess, resolve, entitlement } = useMeStateV2();

  if (!authReady.value) {
    return;
    // await resolve();
  }

  const FREE_TOPICS = [
    "survival-essentials",
    "greetings-polite",
    "fruits-vegetables",
    "clothing",
  ];

  // ✅ Free topics
  if (FREE_TOPICS.includes(topic)) {
    return;
  }

  // 🔒 Premium required
  // if (!hasPaidAccess.value) {
  //   return navigateTo("/upgrade", { replace: true });
  // }

  if (!canAccessLevel(entitlement.value!)) {
    return navigateTo("/upgrade");
  }
});
