const focusRoutePatterns = [
  /^\/quiz\/[^/]+\/(?:word|audio)\/v2\/test$/,
  /^\/quiz\/[^/]+\/sentences\/(?:audio|no-audio)\/v3$/,
  /^\/quiz\/[^/]+\/echo-gecko$/,
  /^\/topic\/quiz\/vocabulary\/(?:word|audio)\/v5\/[^/]+$/,
  /^\/topic\/quiz\/sentences\/(?:audio|no-audio)\/[^/]+\/v3$/,
  /^\/topic\/quiz\/echo-gecko\/[^/]+$/,
  /^\/daily\/(?:vocab|jyutping)\/v2$/,
  /^\/dojo\/(?:level|topic)\/(?:chinese|jyutping|sentences\/chinese)\/training\/[^/]+\/v2$/,
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
  if (path.startsWith('/dojo/topic/')) return '/dojo/topic'
  if (path.startsWith('/dojo/level/')) return '/dojo/level'
  return '/'
}
