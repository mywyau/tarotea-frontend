// export interface DailyItem {
//   id: string;
//   word: string;
//   meaning: string;
// }

export interface DailyWord {
  id: string
  word: string
  meaning: string
}

export interface DailySessionResponse {
    locked: boolean
    required?: number
    current?: number
    completed: boolean
    xpEarnedToday: number
    correctCount: number
    totalQuestions: number
    answeredCount: number
    remainingCount?: number
    words: DailyWord[]
}

export interface DailySessionRow {
  user_id: string
  session_date: string
  word_ids: string[]
  answered_word_ids: string[] | null
  total_questions: number
  answered_count: number
  correct_count: number
  xp_earned: number
  completed: boolean
}
