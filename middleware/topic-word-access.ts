// export default defineNuxtRouteMiddleware(async (to) => {
//   const topic = to.params.topic as string | undefined;
//   const slug = to.params.slug as string | undefined;

//   if (!topic || !slug) return;

//   const { authReady, resolve, entitlement, hasPaidAccess } = useMeStateV2();

//   // ✅ Wait for auth before continuing
//   if (!authReady.value) {
//     await resolve();
//   }

//   const FREE_TOPICS = [
//     "survival-essentials",
//     "greetings-polite",
//     "fruits-vegetables",
//     "clothing",
//   ];

//   // Free topics allowed
//   if (FREE_TOPICS.includes(topic)) {
//     return;
//   }

//   const hasPremium =
//     entitlement.value?.active &&
//     ["monthly", "yearly"].includes(entitlement.value.plan);

//   if (!hasPremium) {
//     return navigateTo("/upgrade", { replace: true });
//   }
// });

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
