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
  if (process.server) return;

  const { me, authReady } = useMeState();

  // ⛔ Wait until auth is resolved
  if (!authReady.value) return;

  if (!canAccessLevel(levelNumber, me.value)) {
    return navigateTo("/upgrade/coming-soon");
  }
});
