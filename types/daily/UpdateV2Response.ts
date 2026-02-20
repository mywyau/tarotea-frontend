type UpdateV2Response = {
  success: true
  delta: number
  optimisticXp: number
  optimisticStreak: number
  dailyBlocked?: boolean
  daily?: {
    answeredCount: number
    correctCount: number
    xpEarned: number
    totalQuestions: number
  } | null
}