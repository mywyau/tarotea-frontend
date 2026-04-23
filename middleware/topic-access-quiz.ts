export default defineNuxtRouteMiddleware(async (to) => {

  if (process.server) return; // middleware runs on client only

  const topic = to.params.topic as string;
  if (!topic) return;

  const { isLoggedOut, resolve } = useMeStateV2();

  const isGuestPreviewRoute =
    to.path.includes("/sentences/") || to.path.includes("/vocabulary/");

  await resolve();

  if (isLoggedOut.value) {
    if (isGuestPreviewRoute) {
      return;
    }
    return navigateTo("/please-sign-in");
  }

  return navigateTo("/upgrade");
});
