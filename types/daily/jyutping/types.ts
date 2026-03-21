export type EligibilityResponse = {
    words_seen: number
}

export type DailyDecode = {
    date: string // "YYYY-MM-DD"
    wordId: string
    word: string
    jyutping: string // canonical answer, e.g. "gwai6" or "mou5 so2 wai6"
    meaning?: string
    audioUrl?: string // optional if you host audio assets
}

export type AttemptLog = {
    input: string
    passed: boolean
    perfect: boolean
    message: string
    letters?: string[]
    letterStates?: ('correct' | 'wrong')[]
}

export type DailyStartResponse = {
    session: {
        completed: boolean
        word_ids: string[]
        answered_count: number
        correct_count: number
        xp_earned: number
        total_questions: number
    }
    dailyLocked?: boolean
}

export type QuizState =
    | 'locked'
    | 'loading'
    | 'playing'
    | 'finalizing'
    | 'complete'
    | 'error'


export type SessionAnswer = {
    wordId: string
    correct: boolean
}