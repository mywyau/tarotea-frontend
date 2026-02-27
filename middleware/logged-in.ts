export default defineNuxtRouteMiddleware(() => {
  const {
    state,
    authReady,
    isLoggedIn,
    user,
    entitlement,
    hasPaidAccess, // this is dodgy use entitlements instead please :) to determine access
    isCanceling,
    currentPeriodEnd,
    resolve,
  } = useMeStateV2();

  if (authReady && isLoggedIn.value) {
    return;
  } else {
    return navigateTo("/please-sign-in");
  }
});
