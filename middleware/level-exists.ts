// middleware/level-exists.ts
export default defineNuxtRouteMiddleware((to) => {
  const slug = to.params.slug

  // ⛔ Ignore invalid / transient runs
  if (typeof slug !== 'string') return
  if (slug === 'null') return
  if (!slug) return

  const level = getLevelNumber(slug)

  if (!level) {
    return abortNavigation(
      createError({
        statusCode: 404,
        statusMessage: 'Level not found'
      })
    )
  }
})

