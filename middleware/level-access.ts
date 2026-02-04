export default defineNuxtRouteMiddleware(() => {
  const route = useRoute();
  const slug = route.params.slug as string;

  const levelNumber = getLevelNumber(slug);

  if (!levelNumber) {
    throw createError({ statusCode: 404 });
  }
  // ✅ FREE LEVELS — always allow
  if (levelNumber < 2) {
    return;
  }
  // ⛔ Never run auth logic on server
  // if (process.server) return;

  // const { me, authReady } = useMeState();

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

  // ⛔ Wait until auth is resolved
  if (!authReady.value) return;

  if (!canAccessLevel(levelNumber, entitlement.value!)) {
    return navigateTo("/upgrade/coming-soon");
  }
});
