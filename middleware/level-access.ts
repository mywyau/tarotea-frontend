export default defineNuxtRouteMiddleware((to) => {
  const slug = to.params.slug as string | undefined;
  if (!slug) return;

  const {
    authReady,
    entitlement,
  } = useMeStateV2();

  // ⛔ STOP middleware until auth is ready
  if (!authReady.value) {
    return;
  }

  const levelNumber = getLevelNumber(slug);
  if (!levelNumber) {
    throw createError({ statusCode: 404 });
  }

  // ✅ Free levels
  if (levelNumber <= 3) {
    return;
  }

  // 🚧 Coming soon
  if (levelNumber > 11) {
    return navigateTo("/coming-soon");
  }

  // // 🔒 Paid levels (3+)
  // if (!canAccessLevel(entitlement.value!)) {
  //   return navigateTo("/upgrade");
  // }
});
