export function progressPercent(totalQuestions: number, answeredCount: number) {
  computed(() => {
    if (!totalQuestions) return 0;
    return Math.round((answeredCount / totalQuestions) * 100);
  });
}
