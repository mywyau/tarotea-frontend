const focusRoutePatterns = [
  /^\/(?:topic\/)?quiz\/results$/,
  /^\/quiz\/[^/]+\/(?:word|audio)\/test$/,
  /^\/quiz\/[^/]+\/sentences\/(?:audio|no-audio)$/,
  /^\/quiz\/[^/]+\/echo-gecko$/,
  /^\/topic\/quiz\/vocabulary\/(?:word|audio)\/[^/]+$/,
  /^\/topic\/quiz\/sentences\/(?:audio|no-audio)\/[^/]+$/,
  /^\/topic\/quiz\/echo-gecko\/[^/]+$/,
  /^\/daily\/(?:vocab|jyutping)$/,
  /^\/typing-practice\/(?:level|topic)\/(?:(?:chinese|jyutping)\/training|sentences\/chinese)\/[^/]+$/,
  /^\/echo-lab\//,
  /^\/echo-forest\/[^/]+$/,
  /^\/writing\//,
]

export function isFocusedLearningPath(path: string) {
  const normalizedPath = path.length > 1 ? path.replace(/\/$/, '') : path

  if (normalizedPath.endsWith('/start') || normalizedPath.endsWith('/start-quiz')) {
    return false
  }

  return focusRoutePatterns.some(pattern => pattern.test(normalizedPath))
}

export function getFocusedLearningExitPath(path: string) {
  if (path.startsWith('/topic/quiz/')) return '/topics/quiz'
  if (path.startsWith('/quiz/')) return '/quiz'
  if (path.startsWith('/typing-practice/topic/')) return '/typing-practice/topic'
  if (path.startsWith('/typing-practice/level/')) return '/typing-practice/level'
  return '/'
}
