import { canAccessTopicQuiz, freeTopicsQuiz } from "~/utils/topics/permissions";

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return; // middleware runs on client only

  const topic = to.params.topic as string;
  if (!topic) return;

  const { isLoggedIn, isLoggedOut, resolve, entitlement } = useMeStateV2();
  const isGuestPreviewRoute =
    to.path.includes("/sentences/") ||
    to.path.includes("/vocabulary/");

  await resolve();

  if (isLoggedOut.value) {
    if (isGuestPreviewRoute) {
      return;
    }
    return navigateTo("/please-sign-in");
  }

  // ✅ Free topics always allowed
  if (freeTopicsQuiz.includes(topic)) {
    return;
  }

  // Full paid access
  if (canAccessTopicQuiz(isLoggedIn.value, entitlement.value, topic)) {
    return;
  }

  return navigateTo("/upgrade");
});
