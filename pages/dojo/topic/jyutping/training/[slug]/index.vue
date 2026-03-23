<script setup lang="ts">

definePageMeta({
    ssr: false,
    middleware: ['logged-in'],
    // middleware: ['coming-soon'],
})

import type {
    AttemptLog,
    BatchAttempt,
    LevelData,
    TrainWord
} from '@/types/jyutping/jyutping-training-types'

import {
    baseSound,
    canonicalNoSpace,
    normalizeJyutping,
    scoreJyutpingAttempt,
    splitSyllables,
    splitUserJyutping,
    stripToneToken
} from '@/utils/jyutping/jyutping-utils'

import { generateWeightedWordsLevel } from '@/utils/quiz/generateWeightedWordsLevel'
import {
    playCorrectJingle
} from '@/utils/sounds'
import { sortedTopicJyutpingQuizMeta } from '~/utils/topics/helpers'
import { masteryXp } from '~/utils/xp/helpers'


const route = useRoute()
const slug = computed(() => route.params.slug as string)

const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

const BATCH_SIZE = 20

const loading = ref(true)
const errorState = ref<string | null>(null)

const words = ref<TrainWord[]>([])

const sessionKey = ref<string>('')

const batchAttempts = ref<BatchAttempt[]>([])

const idx = ref(0)

const input = ref('')
const attempts = ref<AttemptLog[]>([])

const showHint = ref(false) // faint jyutping

const current = computed(() => words.value[idx.value] ?? null)

const normalizedInput = computed(() => normalizeJyutping(input.value))
const normalizedAnswer = computed(() => (current.value ? normalizeJyutping(current.value.jyutping) : ''))

const xpDelta = ref<number | null>(null)
const currentXp = ref<number | null>(null)

const hintUsedThisQuestion = ref(false)

const inputRef = ref<HTMLInputElement | null>(null)

const finishing = ref(false)
const MIN_CALCULATING_MS = 1400

const animatedCompletedWords = ref(0)
const animatedXpEarned = ref(0)
const completionAnimated = ref(false)
const completionSoundPlayed = ref(false)

const topicMeta = computed(() =>
    sortedTopicJyutpingQuizMeta.find(t => t.id === slug.value)
)

const topicTitle = computed(() =>
    topicMeta.value?.title ?? slug.value
)


const live = computed(() => {
    if (!current.value) return { state: 'idle' as const }

    const u = normalizedInput.value
    const a = normalizedAnswer.value

    if (!u) return { state: 'idle' as const }

    const uBase = baseSound(u)
    const aBase = baseSound(a)

    // ✅ Perfect: exact canonical match including tones/spaces
    if (canonicalNoSpace(u) === canonicalNoSpace(a)) {
        return { state: 'perfect' as const }
    }

    // ✅ Pass: base sound matches (tone may differ)
    if (uBase && uBase === aBase) {
        return { state: 'pass' as const }
    }

    // 👀 Partial: they are typing the right “shape” (prefix match)
    // e.g. user typed "gw" and answerBase starts with "gw"
    if (uBase && aBase.startsWith(uBase)) {
        return { state: 'partial' as const }
    }

    // Otherwise: not matching
    return { state: 'miss' as const }
})

const answerSyllables = computed(() => splitSyllables(current.value?.jyutping ?? ''))

const userSyllables = computed(() => splitUserJyutping(input.value))

const answerBaseNoSpace = computed(() =>
    baseSound(current.value?.jyutping ?? '')
)

const userBaseNoSpace = computed(() =>
    baseSound(input.value)
)

const chineseChars = computed(() =>
    current.value?.word.split('') ?? []
)

const charStates = computed(() => {
    const ans = answerSyllables.value
    const usrBase = userBaseNoSpace.value

    let cursor = 0

    return ans.map((ansTok) => {
        const ansBase = stripToneToken(ansTok)

        const segment = usrBase.slice(cursor, cursor + ansBase.length)

        const fullyCorrect = segment === ansBase

        cursor += ansBase.length

        return fullyCorrect ? 'correct' : 'idle'
    })
})

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function animateCount(target: { value: number }, end: number, duration = 1000) {
    const start = target.value
    const diff = end - start
    const startTime = performance.now()

    const tick = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1)
        target.value = Math.round(start + diff * progress)

        if (progress < 1) {
            requestAnimationFrame(tick)
        }
    }

    requestAnimationFrame(tick)
}

function resetCompletionAnimations() {
    animatedCompletedWords.value = 0
    animatedXpEarned.value = 0
    completionAnimated.value = false
    completionSoundPlayed.value = false
}

async function fetchWords() {
    loading.value = true
    errorState.value = null
    finishing.value = false
    resetCompletionAnimations()

    try {
        const levelData = await $fetch<LevelData>(
            `/api/topic/${slug.value}`
        )

        const allWords = Object.values(levelData.categories).flat()

        const { getAccessToken } = await useAuth()
        const token = await getAccessToken()

        let weakestIds: string[] = []

        try {
            const weakest = await $fetch<{ id: string }[]>(
                '/api/word-progress/weakest',
                {
                    query: { topic: slug.value },
                    headers: { Authorization: `Bearer ${token}` }
                }
            )

            weakestIds = weakest.map(w => w.id)
        } catch {
            weakestIds = []
        }

        const selected = generateWeightedWordsLevel(
            allWords,
            weakestIds,
            { totalQuestions: 20, weakestRatio: 0.8 }
        )

        words.value = selected.map(w => ({
            wordId: w.id,
            word: w.word,
            jyutping: w.jyutping,
            meaning: w.meaning
        }))

        idx.value = 0
        input.value = ''
        attempts.value = []
        batchAttempts.value = []
        sessionResult.value = null
        showHint.value = false
        hintUsedThisQuestion.value = false
        xpDelta.value = null
    } catch (e: any) {
        errorState.value =
            e?.data?.message || e?.message || 'Failed to load training words.'
    } finally {
        loading.value = false
    }
}

// ---------- Actions ----------

function submit() {
    if (!current.value) return

    const result = scoreJyutpingAttempt(input.value, current.value.jyutping)

    attempts.value.push({
        input: input.value.trim(),
        passed: result.passed,
        message: result.message,
    })

    input.value = ''
}

const fullJyutping = computed(() =>
    current.value?.jyutping ?? ''
)

type RenderState = 'idle' | 'correct'

const jyutpingRenderStates = computed<RenderState[]>(() => {
    const full = fullJyutping.value
    const usr = userBaseNoSpace.value

    let letterIndex = 0

    return full.split('').map((char) => {
        // if not a-z letter, don't compare
        if (!/[a-z]/i.test(char)) {
            return 'idle'
        }

        const userChar = usr[letterIndex]

        if (userChar && userChar === char.toLowerCase()) {
            letterIndex++
            return 'correct'
        }

        return 'idle'
    })
})

type SylState = 'idle' | 'correct'

const syllableStates = computed<SylState[]>(() => {
    const ans = answerSyllables.value
    const usr = userSyllables.value

    const currentTypingIndex = usr.length - 1

    return ans.map((ansTok, i) => {
        const usrTok = usr[i]
        if (!usrTok) return 'idle'

        const ansBase = stripToneToken(ansTok)
        const usrBase = stripToneToken(usrTok)

        // fully correct syllable
        if (usrBase === ansBase) return 'correct'

        // only allow prefix match on the currently typing syllable
        if (
            i === currentTypingIndex &&
            ansBase.startsWith(usrBase)
        ) {
            return 'correct'
        }

        return 'idle'
    })
})

const copied = ref(false)

async function copyJyutping() {
    if (!current.value?.jyutping) return

    try {
        await navigator.clipboard.writeText(current.value.jyutping)
        copied.value = true

        // Reset after 1.2s
        setTimeout(() => {
            copied.value = false
        }, 1200)

    } catch (err) {
        console.error('Clipboard failed:', err)
    }
}

let advancing = false
let advanceTimer: ReturnType<typeof setTimeout> | null = null

function resetTraining(options?: { reshuffle?: boolean }) {
    advancing = false

    if (advanceTimer) {
        clearTimeout(advanceTimer)
        advanceTimer = null
    }

    input.value = ''
    attempts.value = []
    showHint.value = false
    hintUsedThisQuestion.value = false
    idx.value = 0
    batchAttempts.value = []
    sessionResult.value = null
    finishing.value = false
    resetCompletionAnimations()

    if (options?.reshuffle) {
        words.value = shuffleFisherYates(words.value)
    }

    const firstId = words.value[0]?.wordId
    currentXp.value = firstId ? (wordProgressMap.value[firstId]?.xp ?? 0) : 0
}

const sessionResult = ref<{
    xpEarned: number
    correctCount: number
} | null>(null)

const completedWordsCount = computed(() =>
    sessionResult.value?.correctCount ?? 0
)

const totalWordsCount = computed(() =>
    words.value.length
)

const hintsUsedCount = computed(() =>
    batchAttempts.value.filter(a => a.hintUsed).length
)

const hintFreeCount = computed(() =>
    Math.max(0, completedWordsCount.value - hintsUsedCount.value)
)

const hintUsageRatio = computed(() => {
    if (!completedWordsCount.value) return 0
    return hintsUsedCount.value / completedWordsCount.value
})

const showTraining = computed(() =>
    !finishing.value && !sessionResult.value
)

const showCalculating = computed(() =>
    finishing.value
)

const showResults = computed(() =>
    !finishing.value && !!sessionResult.value
)

const resultHeroClass = computed(() => {
    if (hintsUsedCount.value === 0) return 'result-3'
    if (hintUsageRatio.value <= 0.25) return 'result-0'
    if (hintUsageRatio.value <= 0.6) return 'result-2'
    return 'result-1'
})

const resultMeta = computed(() => {
    if (hintsUsedCount.value === 0) {
        return { title: 'Excellent work' }
    }

    if (hintUsageRatio.value <= 0.25) {
        return { title: 'Great job' }
    }

    if (hintUsageRatio.value <= 0.6) {
        return { title: 'Nice progress' }
    }

    return { title: 'Keep practicing' }
})

const completionTiles = computed(() => [
    // {
    //     label: 'Words Completed',
    //     value: animatedCompletedWords.value,
    //     suffix: '',
    //     className: 'result-0'
    // },
    {
        label: 'Hint-Free',
        value: hintFreeCount.value,
        suffix: '',
        className: 'result-3'
    },
    {
        label: 'Hints Used',
        value: hintsUsedCount.value,
        suffix: '',
        className: 'result-1'
    },
    {
        label: 'XP Earned',
        value: animatedXpEarned.value,
        suffix: 'XP',
        className: 'result-2',
        prefix: animatedXpEarned.value > 0 ? '+' : ''
    }
])

async function finalizeBatch() {
    finishing.value = true

    try {
        const { getAccessToken } = await useAuth()
        const token = await getAccessToken()

        const [res] = await Promise.all([
            $fetch<{
                session: {
                    xpEarned: number
                    correctCount: number
                }
            }>('/api/jyutping/finalize', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: {
                    level: slug.value,
                    sessionKey: sessionKey.value,
                    attempts: batchAttempts.value,
                    mode: 'grind-topic'
                }
            }),
            sleep(MIN_CALCULATING_MS)
        ])

        sessionResult.value = res.session
        idx.value = words.value.length
    } catch (err) {
        console.error('Finalize failed', err)
        errorState.value = 'Failed to save your session.'
    } finally {
        finishing.value = false
    }
}

const wordAudio = ref<HTMLAudioElement | null>(null)

function playCurrentAudio() {
    if (!current.value) return

    const src = `${cdnBase}/audio/${current.value.wordId}.mp3`

    if (!wordAudio.value) {
        wordAudio.value = new Audio()
    }

    wordAudio.value.src = src
    wordAudio.value.currentTime = 0
    wordAudio.value.play().catch(() => { })
}

function advance() {
    if (isComplete.value) return
    if (idx.value < words.value.length - 1) {
        idx.value++
        input.value = ''
        attempts.value = []
        hintUsedThisQuestion.value = false   // 🔥 reset here
        showHint.value = false
    }
}

const isComplete = computed(() => idx.value >= words.value.length)

const wordProgressMap = ref<Record<string, { xp: number }>>({})

function startNewSession() {
    sessionKey.value = crypto.randomUUID()
    batchAttempts.value = []
    sessionResult.value = null
    finishing.value = false
    resetCompletionAnimations()
    fetchWords()
}

watch(
    () => words.value,
    async (ws) => {
        if (!ws.length) return

        const { getAccessToken } = await useAuth()
        const token = await getAccessToken()

        const wordIds = ws.map(w => w.wordId)

        const progressMap = await $fetch<
            Record<string, { xp: number }>
        >('/api/word-progress', {
            query: { wordIds: wordIds.join(',') },
            headers: { Authorization: `Bearer ${token}` }
        })

        wordProgressMap.value = progressMap

        const firstId = ws[0]?.wordId
        currentXp.value = progressMap[firstId]?.xp ?? 0
    },
    { immediate: true }
)

watch(
    () => current.value?.wordId,
    (id) => {
        if (!id) return
        currentXp.value = wordProgressMap.value[id]?.xp ?? 0
        xpDelta.value = null
    }
)

watch(() => live.value.state, async (state) => {

    if (state !== 'pass' && state !== 'perfect') return

    if (advancing) return
    if (!current.value) return

    advancing = true

    if (!batchAttempts.value.some(a => a.wordId === current.value!.wordId)) {

        // Example scoring logic (match your backend logic)

        const hintWasUsed = hintUsedThisQuestion.value

        let delta = 3  // base correct

        if (hintWasUsed) {
            delta = 1
        }

        xpDelta.value = delta

        // Optimistic UI update
        currentXp.value = Math.min((currentXp.value ?? 0) + delta, masteryXp)


        batchAttempts.value.push({
            wordId: current.value.wordId,
            passed: true,
            hintUsed: hintWasUsed
        })

        // Clear floating delta after animation
        setTimeout(() => {
            xpDelta.value = null
        }, 1000)
    }

    // 🔔 Play procedural jingle
    playCorrectJingle(0.7)

    // Wait for jingle envelope (~400ms)
    await new Promise(r => setTimeout(r, 600))

    if (batchAttempts.value.length >= words.value.length) {
        await finalizeBatch()
        advancing = false
        return
    }

    advance()
    advancing = false
}
)
watch(
    () => current.value?.wordId,
    (id) => {
        if (!id || isComplete.value) return

        // small delay feels natural
        setTimeout(() => {
            playCurrentAudio()
        }, 300)
    },
    { immediate: true }
)

watch(
    () => showResults.value,
    (visible) => {
        if (!visible || !sessionResult.value) return

        if (!completionAnimated.value) {
            completionAnimated.value = true
            animateCount(animatedCompletedWords, completedWordsCount.value, 900)
            animateCount(animatedXpEarned, sessionResult.value.xpEarned, 1000)
        }

        if (!completionSoundPlayed.value) {
            completionSoundPlayed.value = true

            if (hintsUsedCount.value === 0) {
                playQuizCompleteFanfareSong()
            } else {
                playQuizCompleteOkaySong()
            }
        }
    }
)

onMounted(() => {
    sessionKey.value = crypto.randomUUID()
    fetchWords()
})

</script>

<template>
    <main class="mx-auto max-w-xl px-6 pt-12 pb-28 sm:pb-12">

        <div class="mb-6">
            <NuxtLink :to="`/dojo/topic`" class="text-black text-sm hover:underline">
                ← Back to Topic Dojo
            </NuxtLink>
        </div>

        <header class="space-y-4">

            <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
                Chinese Dojo - {{ topicTitle }}
            </h1>

            <p class="text-sm text-gray-600">
                Type the jyutping for each word shown
            </p>
        </header>

        <section :class="[
            'mt-8',
            showCalculating || showResults
                ? 'bg-transparent shadow-none p-0'
                : 'rounded-2xl bg-white p-5 shadow-sm'
        ]">
            <div v-if="loading" class="text-sm text-gray-600">
                Loading training words…
            </div>

            <div v-else-if="errorState" class="text-sm text-red-700">
                {{ errorState }}
            </div>

            <div v-else class="space-y-5">
                <div v-if="showTraining" class="space-y-5">
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div class="text-xs text-black">
                            Word {{ idx + 1 }} / {{ words.length }}
                        </div>

                        <div class="flex items-center gap-2">
                            <button
                                class="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                                type="button" @click="resetTraining({ reshuffle: true })">
                                Reset
                            </button>

                            <AudioButton :key="current?.wordId" :src="`${cdnBase}/audio/${current?.wordId}.mp3`" />
                        </div>
                    </div>

                    <div class="rounded-2xl bg-gray-50 p-5">
                        <div class="text-4xl font-medium flex gap-1 leading-none tracking-wide">
                            <span v-for="(char, i) in chineseChars" :key="i" class="transition-all duration-200" :class="{
                                'text-green-600 font-semibold': charStates[i] === 'correct',
                                'text-gray-400': syllableStates[i] === 'idle'
                            }">
                                {{ char }}
                            </span>
                        </div>

                        <div v-if="current?.meaning" class="mt-2 text-lg text-gray-700">
                            {{ current.meaning }}
                        </div>

                        <div class="mt-4 mb-6 min-h-[36px]">
                            <button type="button" @click="() => {
                                showHint = !showHint
                                if (showHint) hintUsedThisQuestion = true
                            }" class="text-xs text-gray-500 hover:text-gray-700 transition underline">
                                {{ showHint ? 'Hide Jyutping' : 'Show Jyutping (hint)' }}
                            </button>

                            <transition name="fade-word">
                                <div v-if="showHint" class="mt-2">
                                    <div class="text-base font-mono break-all leading-relaxed">
                                        <span v-for="(char, i) in fullJyutping.split('')" :key="i" :class="{
                                            'text-green-600 font-semibold': jyutpingRenderStates[i] === 'correct',
                                            'text-gray-400': jyutpingRenderStates[i] === 'idle'
                                        }">
                                            {{ char }}
                                        </span>
                                    </div>

                                    <button type="button" @click="copyJyutping"
                                        class="mt-2 bg-white text-xs px-2 py-1 rounded-md border border-gray-300 hover:bg-gray-100 transition">
                                        {{ copied ? '✓' : 'copy' }}
                                    </button>
                                </div>
                            </transition>
                        </div>

                        <div class="flex items-center max-w-xs">
                            <div class="w-28 mr-2">
                                <div class="h-[3px] bg-gray-200 rounded">
                                    <div class="h-[3px] bg-green-500 rounded transition-all duration-500"
                                        :style="{ width: Math.min((currentXp ?? 0) / masteryXp * 100, 100) + '%' }" />
                                </div>
                            </div>

                            <div class="relative flex items-center">
                                <span class="text-sm text-gray-600 whitespace-nowrap">
                                    {{ currentXp ?? 0 }} / {{ masteryXp }} XP
                                </span>

                                <transition name="xp-fall">
                                    <span v-if="xpDelta !== null"
                                        class="absolute left-full ml-2 text-sm font-semibold pointer-events-none"
                                        :class="xpDelta > 0 ? 'text-green-600' : 'text-red-600'">
                                        {{ xpDelta > 0 ? '+' + xpDelta : xpDelta }}
                                    </span>
                                </transition>
                            </div>
                        </div>

                        <div class="space-y-3 mt-2">
                            <label class="hidden sm:block text-sm font-medium text-gray-800">
                                Type here:
                            </label>

                            <input ref="inputRef" autofocus v-model="input" :disabled="isComplete" autocomplete="off"
                                inputmode="text"
                                class="w-full rounded-xl border-2 border-gray-300 px-4 py-4 text-xl font-mono tracking-wide outline-none focus:border-black transition" />
                        </div>
                    </div>

                    <div class="h-24 sm:h-0"></div>

                    <div class="pt-2 text-xs text-gray-500">
                        Tip: try typing without spaces, do not worry about tones.
                    </div>
                </div>

                <transition name="fade-scale" mode="out-in">
                    <div v-if="showCalculating" key="calculating" class="stat-card hero-card result-2 space-y-4">
                        <div class="spinner mx-auto" />

                        <p class="stat-label">
                            Calculating
                        </p>

                        <h2 class="hero-title">
                            Saving your session...
                        </h2>

                        <p class="hero-subtext">
                            Updating your XP and preparing your results
                        </p>
                    </div>

                    <div v-else-if="showResults" key="results" class="space-y-6">
                        <div class="stat-card hero-card" :class="resultHeroClass">
                            <p class="stat-label">
                                Session Complete
                            </p>

                            <h2 class="hero-title">
                                {{ resultMeta.title }}
                            </h2>

                            <p class="hero-subtext">
                                {{ completedWordsCount }} / {{ totalWordsCount }} words completed
                            </p>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                            <div v-for="tile in completionTiles" :key="tile.label"
                                class="stat-card hover:brightness-110" :class="tile.className">
                                <p class="stat-label">
                                    {{ tile.label }}
                                </p>

                                <p class="stat-value">
                                    {{ tile.prefix ?? '' }}{{ tile.value }} {{ tile.suffix }}
                                </p>
                            </div>
                        </div>

                        <div class="pt-2 space-y-3">
                            <button
                                class="block w-full rounded-xl text-black py-3 text-center font-medium hover:brightness-110 transition"
                                style="background-color:#A8CAE0;" @click="startNewSession">
                                Play again
                            </button>

                            <NuxtLink to="/dojo/topic"
                                class="block w-full rounded-xl text-gray-900 py-3 text-center font-medium hover:brightness-110 transition"
                                style="background-color:rgba(244,205,39,0.35);">
                                Back to Topic Dojo
                            </NuxtLink>
                        </div>
                    </div>
                </transition>
            </div>
        </section>
    </main>
</template>


<style scoped>
.xp-fall-enter-active {
    transition: transform 0.45s ease-out, opacity 0.45s ease-out;
}

.xp-fall-leave-active {
    transition: transform 0.35s ease-in, opacity 0.35s ease-in;
}

.xp-fall-enter-from {
    opacity: 0;
    transform: translateY(-10px) scale(0.9);
}

.xp-fall-enter-to {
    opacity: 1;
    transform: translateY(0px) scale(0.95);
}

.xp-fall-leave-to {
    opacity: 0;
    transform: translateY(12px) scale(0.9);
}

.fade-streak-enter-active,
.fade-streak-leave-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-streak-enter-from,
.fade-streak-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}

.fade-word-enter-active,
.fade-word-leave-active {
    transition: opacity 0.15s ease;
}

.fade-word-enter-from,
.fade-word-leave-to {
    opacity: 0;
}

.stat-card {
    border-radius: 22px;
    padding: 1.5rem;
    text-align: center;
    backdrop-filter: blur(6px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.stat-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.08);
}

.stat-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(17, 24, 39, 0.65);
}

.stat-value {
    font-size: 1.2rem;
    font-weight: 700;
    margin-top: 0.75rem;
    color: #111827;
}

.result-0 {
    background: rgba(168, 202, 224, 0.45);
}

.result-1 {
    background: rgba(246, 225, 225, 0.75);
}

.result-2 {
    background: rgba(244, 205, 39, 0.35);
}

.result-3 {
    background: rgba(168, 224, 182, 0.45);
}

.hero-card {
    padding: 2rem 1.5rem;
}

.hero-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin-top: 0.35rem;
    color: #111827;
}

.hero-score {
    font-size: 3rem;
    line-height: 1;
    font-weight: 600;
    margin-top: 0.9rem;
    color: #111827;
}

.hero-subtext {
    margin-top: 0.65rem;
    font-size: 0.95rem;
    color: rgba(17, 24, 39, 0.68);
}

.fade-scale-enter-active,
.fade-scale-leave-active {
    transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
}

.spinner {
    width: 52px;
    height: 52px;
    border-radius: 9999px;
    border: 4px solid rgba(17, 24, 39, 0.12);
    border-top-color: rgba(17, 24, 39, 0.75);
    animation: spin 0.9s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
