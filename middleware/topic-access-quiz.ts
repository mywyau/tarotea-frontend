import { freeTopicsQuiz } from "~/utils/topics/permissions";

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return; // middleware runs on client only

  const topic = to.params.topic as string;
  if (!topic) return;

  const { isLoggedIn, isLoggedOut, resolve, entitlement } = useMeStateV2();
  const isSentenceQuizRoute = to.path.includes("/sentences/");

  await resolve();

  if (isLoggedOut.value) {
    if (isSentenceQuizRoute) {
      return;
    }
    return navigateTo("/please-sign-in");
  }

  // ✅ Free topics always allowed
  if (freeTopicsQuiz.includes(topic)) {
    return;
  }

  return;

  // Full paid access
  // if (canAccessTopicQuiz(isLoggedIn.value, entitlement.value, topic)) {
  //   return;
  // }

  return navigateTo("/upgrade");
});
