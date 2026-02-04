export default defineNuxtRouteMiddleware(async (to) => {
  const slug = to.params.slug as string | undefined;
  if (!slug) return;

  const levelNumber = getLevelNumber(slug);

  if (!levelNumber) {
    throw createError({ statusCode: 404 });
  }

  // ✅ Free levels always allowed
  if (levelNumber <= 2) {
    return;
  }

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

  // ⏳ Ensure auth is resolved before gating
  // if (!authReady.value) {
  //   await resolve();
  // }

  // 🔒 Block if user can't access
  if (!canAccessLevel(levelNumber, entitlement.value!) && levelNumber > 4) {
    return navigateTo("/coming-soon");
  }

  if (!canAccessLevel(levelNumber, entitlement.value!)) {
    return navigateTo("/upgrade");
  }
});
