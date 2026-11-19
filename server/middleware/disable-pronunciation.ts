import { PRONUNCIATION_PRACTICE_ENABLED } from '~/config/features'

export default defineEventHandler((event) => {
  if (PRONUNCIATION_PRACTICE_ENABLED) return

  const path = event.path.split('?')[0]
  const isPronunciationApi = path === '/api/pronunciation-check-v3'
    || path === '/api/pronunciation-tone-word-v1'
    || path.startsWith('/api/echo-lab/')

  if (!isPronunciationApi) return

  throw createError({
    statusCode: 503,
    statusMessage: 'Pronunciation practice is temporarily unavailable',
  })
})
