import { isFocusedLearningPath } from './navigation/focusMode'

// Billing and callback URLs can vary per environment. Search URLs use the public domain.
export const searchOrigin = 'https://www.tarotea.co.uk'

export function searchUrl(path: string) {
  return searchOrigin + (path.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/')
}

export function isUtilityPage(path: string) {
  return /^\/(?:account|stats|billing|callback|please-sign-in|coming-soon|content-not-available|feature-unavailable|daily|index-old|echo-forest|echo-lab)(?:\/|$)/.test(path)
    || /^\/(?:level|topic)\/[^/]+\/unlock\//.test(path)
    || isFocusedLearningPath(path)
}

export const publicHubs = [
  '/', '/levels', '/topics', '/quiz', '/topics/quiz', '/typing-practice',
  '/typing-practice/level', '/typing-practice/topic', '/upgrade', '/patch-notes',
  '/contact', '/terms-of-service', '/privacy-notice', '/refund-policy',
]
