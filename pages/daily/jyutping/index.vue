<script setup lang="ts">


definePageMeta({
    ssr: false,
    middleware: ['coming-soon'],
})

import { useCountdownToUtcMidnight } from '~/composables/daily/useCountdownToUtcMidnight'

type EligibilityResponse = {
    wordsSeen: number
}

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
    | 'locked'
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
    'Tones are not marked.',
    'Focus on the shape of the sound.',
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

const solved = ref(false)

const totalLetters = computed(() => {
    if (!challenge.value) return 0
    return baseSound(challenge.value.jyutping).length
})

const showNext = ref(false)

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

const MIN_WORDS_REQUIRED = 20

const seenWords = ref(0)

const canPlayQuiz = computed(() => seenWords.value >= MIN_WORDS_REQUIRED)

const wordsRemaining = computed(() =>
    Math.max(0, MIN_WORDS_REQUIRED - seenWords.value)
)

const state = ref<QuizState>('loading')

const MAX_ATTEMPTS = 6

const attemptsLeft = computed(() =>
    Math.max(0, MAX_ATTEMPTS - attempts.value.length)
)

const lastAttempt = computed(
    () => attempts.value[attempts.value.length - 1] || null
)

async function loadEligibility() {
    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()

    const res = await $fetch<EligibilityResponse>('/api/user/stats', {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })

    seenWords.value = res.wordsSeen ?? 0
}

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
            message: 'Try again.'
        }
    }

    if (toneMatch) {
        return {
            passed: true,
            perfect: true,
            message: 'Perfect!.'
        }
    }

    return {
        passed: true,
        perfect: false,
        message: 'Well done!'
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

const failed = computed(() =>
    !solved.value && attemptsLeft.value === 0
)

const revealedLetters = computed(() => {
    if (!challenge.value) return []

    const answer = baseSound(challenge.value.jyutping).split('')

    if (solved.value || attemptsLeft.value === 0) {
        return answer
    }

    const revealed = Array(answer.length).fill(null)

    for (const attempt of attempts.value) {
        if (!attempt.letters || !attempt.letterStates) continue

        attempt.letters.forEach((letter, i) => {
            if (attempt.letterStates?.[i] === 'correct') {
                revealed[i] = letter
            }
        })
    }

    return revealed
})


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
    solved.value = false
}

async function nextWord() {

    showNext.value = false
    currentIndex.value++

    if (currentIndex.value < wordIds.value.length) {
        await loadWord(wordIds.value[currentIndex.value])
        return
    }

    state.value = 'finalizing'

    await finalizeDaily()

    playQuizCompleteFanfareSong()  // 🎉 play completion sound
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
        await loadEligibility()

        if (!canPlayQuiz.value) {
            state.value = 'locked'
            return
        }

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
    if (solved.value) return
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
        playCorrectJingle()   // 🔊 play success sound
        sessionAnswers.value.push({
            wordId: challenge.value.wordId,
            correct: true
        })
        solved.value = true
        showNext.value = true
    }

    // incorrect but attempts left
    if (attemptsLeft.value > 0) return

    playIncorrectJingle()   // 🔊 play fail sound

    // incorrect and attempts exhausted
    sessionAnswers.value.push({
        wordId: challenge.value.wordId,
        correct: false
    })

    // return nextWord()
    showNext.value = true
}

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

        <div class="mb-6">
            <NuxtLink :to="`/`" class="text-black text-sm hover:underline">
                ← Back to Home
            </NuxtLink>
        </div>

        <header v-if="state !== 'complete'" class="space-y-3">
            <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
                Daily Sound Decode
            </h1>

            <p class="text-sm text-gray-600">
                Guess the jyutping.
            </p>
        </header>

        <section :class="[
            'mt-8 p-5',
            state === 'complete'
                ? 'bg-transparent border-0 shadow-none'
                : 'rounded-xl border border-gray-200 bg-white shadow-sm'
        ]">

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
            <div v-else-if="state === 'complete'" class="flex flex-col items-center text-center px-4 py-6">

                <!-- Title -->
                <h2 class="text-xl sm:text-2xl font-bold mb-6 tracking-wide">
                    Daily Exercise Complete!
                </h2>

                <!-- Score Card -->
                <div class="w-full max-w-sm rounded-xl p-5 mb-3">

                    <p class="text-xs uppercase tracking-wide text-gray-500 mb-2">
                        Score
                    </p>

                    <div class="flex items-center justify-center text-3xl font-bold">

                        <span class="text-[#7FB9D8]">
                            {{ correctCount }} / {{ totalQuestions }}
                        </span>

                    </div>

                </div>

                <!-- XP Card -->
                <div class="w-full max-w-sm rounded-xl p-5 mb-4">

                    <p class="text-xs uppercase tracking-wide text-gray-500 mb-2">
                        XP Earned
                    </p>

                    <p class="text-3xl font-bold text-emerald-500">
                        +{{ xpEarned }} XP
                    </p>

                </div>

                <!-- Countdown -->
                <div class="w-full max-w-sm rounded-xl p-5 mb-8">

                    <p class="text-xs uppercase tracking-wide text-gray-500 mb-3">
                        Next daily unlocks in
                    </p>

                    <div class="bg-black rounded-lg py-3">

                        <span class="text-2xl font-semibold
        bg-gradient-to-r
        from-[#EAB8E4]
        via-[#A8CAE0]
        to-[#D6A3D1]
        bg-clip-text text-transparent brightness-125">
                            {{ timeRemaining }}
                        </span>

                    </div>

                </div>
            </div>

            <!-- Locked -->
            <div v-else-if="state === 'locked'" class="py-8 text-center space-y-4">

                <div class="inline-block rounded-xl px-4 py-2 text-sm font-medium text-black">
                    Quiz locked
                </div>

                <p class="text-sm text-gray-700">
                    You need to see at least {{ MIN_WORDS_REQUIRED }} words before playing this quiz.
                </p>

                <p class="text-sm text-gray-500">
                    You have seen {{ seenWords }} word<span v-if="seenWords !== 1">s</span>.
                    {{ wordsRemaining }} more to unlock.
                </p>

                <NuxtLink to="/topics/quiz" class="inline-block rounded-xl px-4 py-3 font-medium text-black"
                    style="background: rgb(249, 166, 166);">
                    Explore words
                </NuxtLink>
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
                                class="w-5 h-6 border-b flex items-end justify-center text-sm" :class="[
                                    failed
                                        ? 'border-red-400 text-red-500'
                                        : revealedLetters[i]
                                            ? 'border-green-500 text-green-600'
                                            : 'border-gray-400 text-transparent'
                                ]">
                                {{ failed ? letter : (revealedLetters[i] ?? '•') }}
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

                    <input ref="inputRef" v-model="input" :disabled="solved" autocomplete="off" inputmode="text"
                        class="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-gray-400" />

                    <div class="flex items-center justify-between">

                        <div class="text-xs text-gray-600">
                            Attempts left: {{ attemptsLeft }} / {{ MAX_ATTEMPTS }}
                        </div>

                        <button
                            class="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:brightness-110 transition disabled:opacity-40"
                            :disabled="attemptsLeft <= 0 || !input.trim() || solved" type="submit">
                            Submit
                        </button>

                    </div>

                    <p v-if="lastAttempt" class="text-sm"
                        :class="lastAttempt.passed ? 'text-emerald-700' : 'text-red-700'">
                        {{ lastAttempt.message }}
                    </p>

                    <button v-if="showNext" @click="nextWord"
                        class="w-full mt-3 rounded-xl bg-black px-4 py-3 text-white hover:brightness-110 transition">
                        Next
                    </button>

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
