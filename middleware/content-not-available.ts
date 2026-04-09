export default defineNuxtRouteMiddleware(async (to) => {
  return navigateTo("/content-not-available");
});
