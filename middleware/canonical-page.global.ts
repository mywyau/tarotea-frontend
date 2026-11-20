export default defineNuxtRouteMiddleware((to) => {
  const record = to.matched.at(-1);
  // Inspect the route template so a slug such as "v2" is preserved.
  if (!to.name || !record?.aliasOf || !/\/v\d+(?:\/|$)/.test(record.path)) return;

  return navigateTo({
    name: to.name,
    params: to.params,
    query: to.query,
    hash: to.hash,
  }, { redirectCode: 301, replace: true });
});
