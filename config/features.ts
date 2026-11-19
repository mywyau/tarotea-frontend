export const PRONUNCIATION_PRACTICE_ENABLED = false

export function isPronunciationPracticePath(path: string) {
  return path.startsWith('/echo-forest/')
    || path.startsWith('/echo-lab/')
    || /^\/quiz\/[^/]+\/echo-gecko\/?$/.test(path)
    || path.startsWith('/topic/quiz/echo-gecko/')
}
