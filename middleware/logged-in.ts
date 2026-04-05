export default defineNuxtRouteMiddleware(() => {
  const {
    isLoggedIn,
    isLoggedOut,
    resolve,
  } = useMeStateV2();

  if (isLoggedOut.value) {
    return navigateTo("/please-sign-in");        
  }

  if (!isLoggedIn.value) {
    return resolve();
  }

  if (isLoggedIn.value) {
    return;
  } else {
    return navigateTo("/please-sign-in");
  }
});
