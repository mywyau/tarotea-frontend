export default defineNuxtRouteMiddleware((to) => {

  const {
    state,
    authReady,
    isLoggedIn,
    user,
    entitlement,
    hasPaidAccess,
    isCanceling,
    currentPeriodEnd,
    resolve,
  } = useMeStateV2();

  // if (!authReady.value) return;

  const levelId = to.params.slug as string;

  const comingSoonLevels = ["level-five", "level-six"];

  if (comingSoonLevels.includes(levelId)) {
    return navigateTo("/content-not-available");
  }
});
