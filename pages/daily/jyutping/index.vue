<script setup lang="ts">

definePageMeta({
    ssr: false,
    middleware: ['logged-in'],
    // middleware: ['coming-soon'],
})

import { useCountdownToUtcMidnight } from '~/composables/daily/useCountdownToUtcMidnight'

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

type QuizState =
    | 'loading'
    | 'playing'
    | 'finalizing'
    | 'complete'
    | 'error'

const state = ref<QuizState>('loading')

const MAX_ATTEMPTS = 6

const tips = [
    'No need to be perfect first try.',
    'Correct answers do not need tones, we\'re not that mean ;)',
    'Focus on the sound shape.',
    'Break the word into syllables.',
    'Try saying it out loud before typing.',
    'Wrong guesses still improve recall.'
]

const currentTipIndex = ref(0)

const { public: { cdnBase } } = useRuntimeConfig();

const challenge = ref<DailyDecode | null>(null)

const input = ref('')
const attempts = ref<AttemptLog[]>([])

const inputRef = ref<HTMLInputElement | null>(null)

const errorMessage = ref('')

const todayKey = computed(() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
})

const totalLetters = computed(() => {
    if (!challenge.value) return 0
    return baseSound(challenge.value.jyutping).length
})

function scoreLetters(userRaw: string, answerRaw: string) {
    const userBase = baseSound(userRaw)
    const answerBase = baseSound(answerRaw)

    const letters = userBase.split('')
    const states: ('correct' | 'wrong')[] = []

    for (let i = 0; i < letters.length; i++) {
        if (i < answerBase.length && letters[i] === answerBase[i]) {
            states.push('correct')
        } else {
            states.push('wrong')
        }
    }

    return { letters, states }
}

const storageKey = computed(() => `tarotea:daily-decode:${todayKey.value}`)

// ---------- Normalization & scoring ----------

function normalizeJyutping(raw: string): string {
    return raw
        .toLowerCase()
        .trim()
        .replace(/[，。,.;:!?]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/-/g, ' ')
}

function hasToneNumbers(jp: string): boolean {
    // Require at least one tone digit 1–6 somewhere.
    return /[1-6]/.test(jp)
}

function baseSound(jp: string): string {
    // Remove tone digits and spaces to compare base phonetics.
    return normalizeJyutping(jp).replace(/[1-6]/g, '').replace(/\s+/g, '')
}

function canonicalSound(jp: string): string {
    // Canonical strict compare: normalized + remove extra spaces
    return normalizeJyutping(jp).replace(/\s+/g, ' ')
}

function scoreAttempt(userRaw: string, answerRaw: string) {
    const user = normalizeJyutping(userRaw)
    const ans = normalizeJyutping(answerRaw)

    if (!user) {
        return { passed: false, perfect: false, message: 'Type the jyutping.' }
    }

    const userBase = user.replace(/[1-6]/g, '').replace(/\s+/g, '')
    const ansBase = ans.replace(/[1-6]/g, '').replace(/\s+/g, '')

    const userNoSpace = user.replace(/\s+/g, '')
    const ansNoSpace = ans.replace(/\s+/g, '')

    const baseMatch = userBase === ansBase
    const toneMatch = userNoSpace === ansNoSpace

    if (!baseMatch) {
        return {
            passed: false,
            perfect: false,
            message: 'The spelling was wrong. Try again'
        }
    }

    if (toneMatch) {
        return {
            passed: true,
            perfect: true,
            message: 'Perfect! You also got the sound and tone correct.'
        }
    }

    return {
        passed: true,
        perfect: false,
        message: 'Pretty good.'
    }
}

// ---------- Persistence ----------

function loadSaved() {
    try {
        const raw = localStorage.getItem(storageKey.value)
        if (!raw) return
        const parsed = JSON.parse(raw) as { attempts: AttemptLog[]; done: boolean; challenge?: DailyDecode }
        if (parsed?.attempts) attempts.value = parsed.attempts
        if (typeof parsed?.done === 'boolean') done.value = parsed.done
        // Optional: store challenge to avoid re-fetch mismatch
        if (parsed?.challenge) challenge.value = parsed.challenge
    } catch {
        // ignore corrupted storage
    }
}

function save() {
    try {
        localStorage.setItem(
            storageKey.value,
            JSON.stringify({
                attempts: attempts.value,
                done: done.value,
                challenge: challenge.value,
            })
        )
    } catch {
        // ignore quota
    }
}

// ---------- Audio ----------

const audio = ref<HTMLAudioElement | null>(null)

function playAudio() {
    if (!challenge.value?.audioUrl) return
    if (!audio.value) audio.value = new Audio(challenge.value.audioUrl)
    audio.value.currentTime = 0
    void audio.value.play()
}

async function loadWord(id: string) {
    const { data } = await useFetch(
        () => `/api/words/${id}`,
        {
            key: () => `word-${id}`,
            server: true
        }
    )

    if (!data.value) return

    challenge.value = {
        date: todayKey.value,
        wordId: data.value.id,
        word: data.value.word,
        jyutping: data.value.jyutping,
        meaning: data.value.meaning,
        audioUrl: data.value.audioUrl
    }

    save()

    // reset per-word state
    input.value = ''
    attempts.value = []
    // done.value = false
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

async function fetchChallenge() {
    state.value = 'loading'

    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()

    try {
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

            xpEarned.value = daily.session.xp_earned ?? 0
            correctCount.value = daily.session.correct_count ?? 0
            totalQuestions.value = daily.session.total_questions ?? 0

            state.value = 'complete'
            return
        }

        const ids = [...new Set(daily.session.word_ids ?? [])]

        if (!ids.length) {
            errorMessage.value = 'No daily words available'
            state.value = 'error'
            return
        }

        wordIds.value = shuffleFisherYates(ids)
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

// ---------- Submit ----------

const attemptsLeft = computed(() => Math.max(0, MAX_ATTEMPTS - attempts.value.length))

const lastAttempt = computed(() => attempts.value[attempts.value.length - 1] || null)

const revealAllowed = computed(() =>
    attemptsLeft.value === 0 && state.value === 'playing'
)

const xpEarned = ref(0)
const correctCount = ref(0)
const totalQuestions = ref(0)

const wordIds = ref<string[]>([])
const currentIndex = ref(0)

const everpassed = computed(() =>
    attempts.value.some(a => a.passed)
)

const everPerfect = computed(() =>
    attempts.value.some(a => a.perfect)
)

const { timeRemaining } = useCountdownToUtcMidnight()


const answerLetters = computed(() => {
    if (!challenge.value) return []
    return baseSound(challenge.value.jyutping).split('')
})

async function submit() {

    if (!challenge.value) return
    if (state.value !== 'playing') return
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

    save()

    input.value = ''

    // ✅ CASE 1: Correct (perfect or base match)
    if (result.passed) {

        sessionAnswers.value.push({
            wordId: challenge.value.wordId,
            correct: true
        })

        currentIndex.value++

        if (currentIndex.value < wordIds.value.length) {
            await loadWord(wordIds.value[currentIndex.value])
        } else {

            state.value = 'finalizing'

            await finalizeDaily()

            challenge.value = null

            state.value = 'complete'
        }
        return
    }

    // ❌ CASE 2: Wrong but still attempts left
    if (attemptsLeft.value > 0) {
        await nextTick()
        const el = document.querySelector('input')
        el?.focus()
        save()
        return
    }

    // ❌ CASE 3: Wrong and no attempts left (word failed)

    sessionAnswers.value.push({
        wordId: challenge.value.wordId,
        correct: false
    })

    currentIndex.value++

    if (currentIndex.value < wordIds.value.length) {
        await loadWord(wordIds.value[currentIndex.value])
    } else {

        await finalizeDaily()
        challenge.value = null
        await new Promise(r => setTimeout(r, 1200))
    }
}

function revealAnswer() {
    if (!challenge.value) return


    input.value = ''

    // ✅ Don't add "(reveal)" into attempts anymore.
    // The UI already has a reveal button + the answer section below.
    save()
}

let tipInterval: number | undefined

type SessionAnswer = {
    wordId: string
    correct: boolean
}

const sessionAnswers = ref<SessionAnswer[]>([])

async function finalizeDaily() {

    if (sessionAnswers.value.length === 0) return

    try {

        const { getAccessToken } = await useAuth()
        const token = await getAccessToken()

        const res = await $fetch('/api/daily/jyutping/finalize', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: {
                answers: sessionAnswers.value
            }
        })

        xpEarned.value = res.daily.xpEarned
        correctCount.value = res.daily.correctCount
        totalQuestions.value = res.daily.totalQuestions

        localStorage.removeItem(storageKey.value)

    } catch (err) {
        console.error('Daily finalize failed', err)
    }
}

onMounted(async () => {

    loadSaved()

    await fetchChallenge()

    tipInterval = window.setInterval(() => {
        currentTipIndex.value =
            (currentTipIndex.value + 1) % tips.length
    }, 5000)

})

onUnmounted(() => {
    if (tipInterval) clearInterval(tipInterval)
})

watch(input, (val) => {
    if (!challenge.value) return

    const cleaned = normalizeJyutping(val)
    const base = cleaned.replace(/[1-6]/g, '').replace(/\s+/g, '')

    if (base.length > totalLetters.value) {
        // trim extra characters
        let trimmed = ''
        let count = 0

        for (const char of cleaned) {
            if (/[1-6]/.test(char)) {
                trimmed += char
                continue
            }

            if (char === ' ') continue

            if (count < totalLetters.value) {
                trimmed += char
                count++
            }
        }

        input.value = trimmed
    }
})
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

            <div v-if="state === 'loading'" class="text-sm text-gray-600">
                Loading today’s words…
            </div>

            <div v-else-if="state === 'error'" class="text-sm text-red-700">
                {{ errorMessage }}
            </div>

            <div v-else-if="state === 'finalizing'" class="flex flex-col items-center justify-center text-center py-10">

                <div class="loader mb-6"></div>

                <p class="text-lg font-semibold text-purple-600">
                    Finalising your score...
                </p>

                <p class="text-sm text-gray-500 mt-2">
                    Calculating XP & results
                </p>

            </div>

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
                    <p class="text-sm text-gray-700 uppercase tracking-wide opacity-100 mb-4">
                        Next daily unlocks in
                    </p>

                    <p class="bg-black rounded-lg py-4 px-3 text-center">
                        <span
                            class="text-3xl font-semibold bg-gradient-to-r from-[#EAB8E4] via-[#A8CAE0] to-[#D6A3D1] bg-clip-text text-transparent hover:brightness-125">
                            {{ timeRemaining }}
                        </span>
                    </p>
                </div>
            </div>

            <div v-else-if="state === 'playing'" class="space-y-5">
                <!-- Word display -->
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <div class="text-4xl font-medium text-gray-900">
                            {{ challenge.word }}
                        </div>
                        <div v-if="challenge.meaning" class="mt-1 text-sm text-gray-600">
                            {{ challenge.meaning }}
                        </div>
                        <div class="flex gap-1 mt-2 font-mono">
                            <div v-for="(letter, i) in answerLetters" :key="i"
                                class="w-5 h-6 border-b flex items-end justify-center text-sm" :class="state === 'complete'
                                    ? 'border-gray-600 text-gray-900'
                                    : 'border-gray-400 text-transparent'">
                                {{ done ? letter : '•' }}
                            </div>
                        </div>
                        <div class="text-xs text-gray-500 mt-2">
                            {{ totalLetters }} letters
                        </div>
                    </div>


                    <button v-if="challenge.audioUrl"
                        class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 active:scale-[0.99] transition"
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

                    <input ref="inputRef" v-model="input" :disabled="state !== 'playing' || attemptsLeft <= 0" autocomplete="off"
                        inputmode="text" placeholder=""
                        class="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-gray-400" />

                    <div class="flex items-center justify-between">
                        <div class="text-xs text-gray-600">
                            Attempts left: {{ attemptsLeft }} / {{ MAX_ATTEMPTS }}
                        </div>

                        <button
                            class="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:brightness-110 active:scale-[0.99] transition disabled:opacity-40"
                            :disabled="state !== 'playing' || attemptsLeft <= 0 || !input.trim()" type="submit">
                            Submit
                        </button>
                    </div>

                    <p v-if="lastAttempt" class="text-sm"
                        :class="lastAttempt.passed ? 'text-emerald-700' : 'text-red-700'">
                        {{ lastAttempt.message }}
                    </p>
                </form>

                <!-- Attempts log -->
                <div v-if="attempts.length" class="pt-2">
                    <div class="text-xs font-semibold text-gray-700 mb-2">Attempts</div>
                    <ul class="space-y-2">
                        <li v-for="(a, idx) in attempts" :key="idx"
                            class="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                            <div class="flex items-center justify-between">
                                <div class="text-sm text-gray-900">

                                    <div class="flex gap-1 font-mono">
                                        <div v-for="(letter, i) in a.letters" :key="i"
                                            class="w-5 h-6 border-b flex items-end justify-center text-sm" :class="a.letterStates?.[i] === 'correct'
                                                ? 'border-green-500 text-green-600'
                                                : 'border-red-300 text-red-500'">
                                            {{ letter }}
                                        </div>
                                    </div>

                                </div>
                                <div class="text-xs" :class="a.passed ? 'text-emerald-700' : 'text-red-500'">
                                    <span v-if="a.perfect">Perfect</span>
                                    <span v-else-if="a.passed">Attempt {{ idx + 1 }}</span>
                                    <span v-else>Attempt {{ idx + 1 }}</span>
                                </div>
                            </div>

                        </li>
                    </ul>
                </div>

                <!-- Reveal (only if failed all attempts and not done) -->
                <div v-if="revealAllowed" class="pt-1">
                    <p v-if="!everpassed" class="mt-2 text-xs text-black mb-4">
                        Daily challenge failed. Try again tomorrow.
                    </p>

                    <p v-else-if="everpassed && !everPerfect" class="mt-2 text-xs text-black mb-4">
                        You were very close. Check the tone and try again tomorrow.
                    </p>
                    <button
                        class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition pt-4"
                        type="button" @click="revealAnswer">
                        Reveal answer
                    </button>

                </div>

                <!-- Calm tip turn this into a carousel -->
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
