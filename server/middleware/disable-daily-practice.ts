export default defineEventHandler(event => {
  const path = getRequestURL(event).pathname
  if (!/^\/api\/daily(?:\/|$)/i.test(path) || useRuntimeConfig(event).public.dailyPracticeEnabled) return

  // Finish signed XP jobs queued before daily practice was paused.
  if (path === '/api/daily/jyutping/v2/xp-worker' || path === '/api/daily/jyutping/v2/xp-worker/') return

  throw createError({ statusCode: 503, statusMessage: 'Daily practice is temporarily unavailable' })
})
