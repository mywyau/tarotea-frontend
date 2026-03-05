<script setup lang="ts">
import { useCountdownToUtcMidnight } from '~/composables/daily/useCountdownToUtcMidnight'


definePageMeta({
    ssr: false,
    middleware: ['logged-in'],
    // middleware: ['coming-soon'],
})

type DailyDecode = {
    date: string // "YYYY-MM-DD"
    wordId: string
    word: string
    jyutping: string // canonical answer, e.g. "gwai6" or "mou5 so2 wai6"
    meaning?: string
    audioUrl?: string // optional if you host audio assets
}

type AttemptLog = {
    input: string
    passed: boolean
    perfect: boolean
    message: string
    letters?: string[]
    letterStates?: ('correct' | 'wrong')[]
}

type DailyStartResponse = {
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

type QuizState =
    | 'loading'
    | 'playing'
    | 'finalizing'
    | 'complete'
    | 'error'


type SessionAnswer = {
    wordId: string
    correct: boolean
}

const tips = [
    'No need to be perfect first try.',
    'Correct answers do not need tones.',
    'Focus on the sound shape.',
    'Break the word into syllables.',
    'Try saying it out loud before typing.'
]

const currentTipIndex = ref(0)

let tipInterval: number | undefined

const { timeRemaining } = useCountdownToUtcMidnight()


onMounted(() => {
    fetchChallenge()

    tipInterval = window.setInterval(() => {
        currentTipIndex.value =
            (currentTipIndex.value + 1) % tips.length
    }, 5000)
})

onUnmounted(() => {
    if (tipInterval) clearInterval(tipInterval)
})

const totalLetters = computed(() => {
    if (!challenge.value) return 0
    return baseSound(challenge.value.jyutping).length
})

const challenge = ref<DailyDecode | null>(null)

const wordIds = ref<string[]>([])
const currentIndex = ref(0)

const input = ref('')
const attempts = ref<AttemptLog[]>([])

const sessionAnswers = ref<SessionAnswer[]>([])

const xpEarned = ref(0)
const correctCount = ref(0)
const totalQuestions = ref(0)

const errorMessage = ref('')

const state = ref<QuizState>('loading')

const MAX_ATTEMPTS = 6

const attemptsLeft = computed(() =>
    Math.max(0, MAX_ATTEMPTS - attempts.value.length)
)

const lastAttempt = computed(
    () => attempts.value[attempts.value.length - 1] || null
)

function normalizeJyutping(raw: string): string {
    return raw
        .toLowerCase()
        .trim()
        .replace(/[，。,.;:!?]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/-/g, ' ')
}

function baseSound(jp: string): string {
    return normalizeJyutping(jp)
        .replace(/[1-6]/g, '')
        .replace(/\s+/g, '')
}

const answerLetters = computed(() => {
    if (!challenge.value) return []
    return baseSound(challenge.value.jyutping).split('')
})

function scoreAttempt(userRaw: string, answerRaw: string) {

    const user = normalizeJyutping(userRaw)
    const ans = normalizeJyutping(answerRaw)

    if (!user) {
        return {
            passed: false,
            perfect: false,
            message: 'Type the jyutping.'
        }
    }

    const userBase = baseSound(user)
    const ansBase = baseSound(ans)

    const userNoSpace = user.replace(/\s+/g, '')
    const ansNoSpace = ans.replace(/\s+/g, '')

    const baseMatch = userBase === ansBase
    const toneMatch = userNoSpace === ansNoSpace

    if (!baseMatch) {
        return {
            passed: false,
            perfect: false,
            message: 'The spelling was wrong. Try again.'
        }
    }

    if (toneMatch) {
        return {
            passed: true,
            perfect: true,
            message: 'Perfect! Sound and tone correct.'
        }
    }

    return {
        passed: true,
        perfect: false,
        message: 'Good! The sound is correct.'
    }
}

function scoreLetters(userRaw: string, answerRaw: string) {

    const userBase = baseSound(userRaw)
    const answerBase = baseSound(answerRaw)

    const letters = userBase.split('')
    const states: ('correct' | 'wrong')[] = []

    for (let i = 0; i < letters.length; i++) {

        if (letters[i] === answerBase[i]) {
            states.push('correct')
        } else {
            states.push('wrong')
        }

    }

    return {
        letters,
        states
    }
}

const audio = ref<HTMLAudioElement | null>(null)

function playAudio() {

    if (!challenge.value?.audioUrl) return

    if (!audio.value) {
        audio.value = new Audio(challenge.value.audioUrl)
    }

    audio.value.currentTime = 0
    audio.value.play().catch(() => { })
}

async function loadWord(id: string) {
    const { data, error } = await useFetch(() => `/api/words/${id}`, {
        key: () => `word-${id}`,
        server: false, // since ssr:false, keep it client-side
    })

    if (error.value || !data.value) {
        errorMessage.value = 'Failed to load word'
        state.value = 'error'
        return
    }

    challenge.value = {
        date: new Date().toISOString().slice(0, 10),
        wordId: data.value.id,
        word: data.value.word,
        jyutping: data.value.jyutping,
        meaning: data.value.meaning,
        audioUrl: data.value.audioUrl,
    }

    // reset per-word UI state
    input.value = ''
    attempts.value = []
}

async function nextWord() {

    currentIndex.value++

    if (currentIndex.value < wordIds.value.length) {
        await loadWord(wordIds.value[currentIndex.value])
        return
    }

    state.value = 'finalizing'

    await finalizeDaily()

    challenge.value = null

    state.value = 'complete'
}

async function finalizeDaily() {

    try {

        const { getAccessToken } = await useAuth()
        const token = await getAccessToken()

        console.log("sending answers", sessionAnswers.value)

        const res = await $fetch<{
            daily: {
                answeredCount: number
                correctCount: number
                xpEarned: number
                totalQuestions: number
            }
        }>('/api/daily/jyutping/finalize', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: {
                answers: sessionAnswers.value
            }
        })

        console.log("finalize response", res)

        xpEarned.value = res.daily.xpEarned
        correctCount.value = res.daily.correctCount
        totalQuestions.value = res.daily.totalQuestions

    } catch (err) {
        console.error('Daily finalize failed', err)
    }
}

async function fetchChallenge() {

    state.value = 'loading'

    try {

        const { getAccessToken } = await useAuth()
        const token = await getAccessToken()

        const daily = await $fetch<DailyStartResponse>(
            '/api/daily/start',
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: {
                    totalQuestions: 5,
                    mode: 'daily-jyutping'
                }
            }
        )

        if (daily.session.completed) {

            xpEarned.value = daily.session.xp_earned
            correctCount.value = daily.session.correct_count
            totalQuestions.value = daily.session.total_questions

            state.value = 'complete'
            return
        }

        wordIds.value = shuffleFisherYates(
            [...new Set(daily.session.word_ids)]
        )

        currentIndex.value = 0

        await loadWord(wordIds.value[0])

        state.value = 'playing'

    } catch (e: any) {

        errorMessage.value =
            e?.data?.message ??
            e?.message ??
            'Failed to load challenge'

        state.value = 'error'
    }
}

async function submit() {

    if (state.value !== 'playing') return
    if (!challenge.value) return
    if (attemptsLeft.value <= 0) return

    const result = scoreAttempt(input.value, challenge.value.jyutping)
    const letterScore = scoreLetters(input.value, challenge.value.jyutping)

    attempts.value.push({
        input: input.value.trim(),
        passed: result.passed,
        perfect: result.perfect,
        message: result.message,
        letters: letterScore.letters,
        letterStates: letterScore.states
    })

    input.value = ''

    // correct answer
    if (result.passed) {

        sessionAnswers.value.push({
            wordId: challenge.value.wordId,
            correct: true
        })

        return nextWord()
    }

    // incorrect but attempts left
    if (attemptsLeft.value > 0) return

    // incorrect and attempts exhausted
    sessionAnswers.value.push({
        wordId: challenge.value.wordId,
        correct: false
    })

    return nextWord()
}

onMounted(() => {
    fetchChallenge()
})

watch(
    () => challenge.value?.audioUrl,
    (src) => {
        if (!src) return
        setTimeout(() => playAudio(), 300)
    }
)

</script>

<template>
    <main class="mx-auto max-w-xl px-6 py-12">

        <header class="space-y-3">
            <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
                Daily Phonetic Jyutping Decode
            </h1>

            <p class="text-sm text-gray-600">
                Guess the correct phonetic. If your sound is right, you pass.
            </p>
        </header>

        <section class="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

            <!-- Loading -->
            <div v-if="state === 'loading'" class="text-sm text-gray-600">
                Loading today’s words…
            </div>

            <!-- Error -->
            <div v-else-if="state === 'error'" class="text-sm text-red-700">
                {{ errorMessage }}
            </div>

            <!-- Finalizing -->
            <div v-else-if="state === 'finalizing'" class="flex flex-col items-center justify-center text-center py-10">
                <div class="loader mb-6"></div>

                <p class="text-lg font-semibold text-purple-600">
                    Finalising your score...
                </p>

                <p class="text-sm text-gray-500 mt-2">
                    Calculating XP & results
                </p>
            </div>

            <!-- Completion -->
            <div v-else-if="state === 'complete'" class="bg-white p-4 space-y-2">

                <div class="text-lg font-semibold text-gray-900">
                    Daily Session Complete
                </div>

                <div class="text-sm text-gray-700">
                    Correct: {{ correctCount }} / {{ totalQuestions }}
                </div>

                <div class="text-sm text-gray-700">
                    XP Earned: {{ xpEarned }}
                </div>

                <div class="text-sm text-gray-600">
                    Come back tomorrow for your new words.
                </div>

                <div class="mt-8 text-sm opacity-100">
                    <p class="text-sm text-gray-700 uppercase tracking-wide mb-4">
                        Next daily unlocks in
                    </p>

                    <p class="bg-black rounded-lg py-4 px-3 text-center">
                        <span
                            class="text-3xl font-semibold bg-gradient-to-r from-[#EAB8E4] via-[#A8CAE0] to-[#D6A3D1] bg-clip-text text-transparent">
                            {{ timeRemaining }}
                        </span>
                    </p>
                </div>
            </div>

            <!-- Quiz -->
            <div v-else-if="state === 'playing' && challenge" class="space-y-5">

                <!-- Word display -->
                <div class="flex items-start justify-between gap-4">

                    <div>
                        <div class="text-4xl font-medium text-gray-900">
                            {{ challenge.word }}
                        </div>

                        <div v-if="challenge.meaning" class="mt-1 text-sm text-gray-600">
                            {{ challenge.meaning }}
                        </div>

                        <!-- hidden answer letters -->
                        <div class="flex gap-1 mt-2 font-mono">
                            <div v-for="(letter, i) in answerLetters" :key="i"
                                class="w-5 h-6 border-b flex items-end justify-center text-sm border-gray-400 text-transparent">
                                •
                            </div>
                        </div>

                        <div class="text-xs text-gray-500 mt-2">
                            {{ totalLetters }} letters
                        </div>
                    </div>

                    <button v-if="challenge.audioUrl"
                        class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                        @click="playAudio" type="button">
                        Play audio
                    </button>

                    <div class="text-xs text-gray-500">
                        Word {{ currentIndex + 1 }} / {{ wordIds.length }}
                    </div>

                </div>

                <!-- Input -->
                <form class="space-y-3" @submit.prevent="submit">

                    <label class="block text-sm font-medium text-gray-800">
                        Your answer:
                    </label>

                    <input ref="inputRef" v-model="input" autocomplete="off" inputmode="text"
                        class="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-gray-400" />

                    <div class="flex items-center justify-between">

                        <div class="text-xs text-gray-600">
                            Attempts left: {{ attemptsLeft }} / {{ MAX_ATTEMPTS }}
                        </div>

                        <button
                            class="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:brightness-110 transition disabled:opacity-40"
                            :disabled="attemptsLeft <= 0 || !input.trim()" type="submit">
                            Submit
                        </button>

                    </div>

                    <p v-if="lastAttempt" class="text-sm"
                        :class="lastAttempt.passed ? 'text-emerald-700' : 'text-red-700'">
                        {{ lastAttempt.message }}
                    </p>

                </form>

                <!-- Attempts -->
                <div v-if="attempts.length" class="pt-2">

                    <div class="text-xs font-semibold text-gray-700 mb-2">
                        Attempts
                    </div>

                    <ul class="space-y-2">

                        <li v-for="(a, idx) in attempts" :key="idx"
                            class="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">

                            <div class="flex items-center justify-between">

                                <div class="flex gap-1 font-mono">

                                    <div v-for="(letter, i) in a.letters" :key="i"
                                        class="w-5 h-6 border-b flex items-end justify-center text-sm" :class="a.letterStates?.[i] === 'correct'
                                            ? 'border-green-500 text-green-600'
                                            : 'border-red-300 text-red-500'">
                                        {{ letter }}
                                    </div>

                                </div>

                                <div class="text-xs" :class="a.passed ? 'text-emerald-700' : 'text-red-500'">
                                    <span v-if="a.perfect">Perfect</span>
                                    <span v-else>Attempt {{ idx + 1 }}</span>
                                </div>

                            </div>

                        </li>

                    </ul>

                </div>

                <!-- Tips -->
                <div class="text-xs text-gray-500 h-5 relative overflow-hidden">

                    <transition name="fade" mode="out-in">
                        <div :key="currentTipIndex" class="absolute inset-0">
                            Tip: {{ tips[currentTipIndex] }}
                        </div>
                    </transition>

                </div>

            </div>

        </section>
    </main>
</template>


<style scoped>
.loader {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 3px solid rgba(168, 85, 247, 0.2);
    border-top: 3px solid rgb(168, 85, 247);
    animation: spin 0.9s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
