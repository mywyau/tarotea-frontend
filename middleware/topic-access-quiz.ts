import { canAccessTopicQuiz, freeTopicsQuiz } from "~/utils/topics/permissions";

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return; // middleware runs on client only

  const topic = to.params.topic as string;
  if (!topic) return;

  const { isLoggedIn, isLoggedOut, resolve, entitlement } = useMeStateV2();

  await resolve();

  if (isLoggedOut.value) {
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
