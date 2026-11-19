import {
  isPronunciationPracticePath,
  PRONUNCIATION_PRACTICE_ENABLED,
} from '~/config/features'

export default defineNuxtRouteMiddleware((to) => {
  if (PRONUNCIATION_PRACTICE_ENABLED || !isPronunciationPracticePath(to.path)) return

  return navigateTo({
    path: '/feature-unavailable',
    query: { feature: 'pronunciation' },
  }, { replace: true })
})
