export default defineNuxtRouteMiddleware((to) => {

  const slug = to.params.slug as string | undefined;
  if (!slug) return;

  const { authReady, entitlement } = useMeStateV2();

  // ⛔ Wait for auth
  if (!authReady.value) {
    return;
  }

  // 🔒 Premium-only topics (if you later flip some to live)
  const hasPremium =
    entitlement.value?.active &&
    (entitlement.value.plan === "monthly" ||
      entitlement.value.plan === "yearly");

  if (!hasPremium) {
    return navigateTo("/upgrade");
  }
});
