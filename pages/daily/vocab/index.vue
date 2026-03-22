<script setup lang="ts">

definePageMeta({
    ssr: false,
    middleware: "logged-in"
})

import { useCountdownToUtcMidnight } from '@/composables/daily/useCountdownToUtcMidnight'
import { useDailySession } from '@/composables/daily/useDailySessionV2'
import { useXpAnimation } from '@/composables/daily/useXpAnimation'
import { computed, onMounted, ref, watch } from 'vue'
import type { DailyWord } from '~/types/daily/DailyItem'

import {
    playQuizCompleteFanfareSong
} from '@/utils/sounds'

import {
    playCorrectJingle,
    playIncorrectJingle
} from '@/utils/sounds'
import { brandColours } from '~/utils/branding/helpers'

const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

const currentIndex = ref(0)                     // Which question user is on
const selected = ref<string | null>(null)       // Selected answer
const showResult = ref(false)                   // Show correct/incorrect styling
const showCompleteView = ref(false)             // Final screen
const finishing = ref(false)                    // "Finalising score" loading state

type DailyAnswer = { wordId: string; correct: boolean }
const answerLog = ref<DailyAnswer[]>([])

const tileColors = ref<string[]>([])

function generateTileColors() {
    tileColors.value = shuffleFisherYates([...brandColours]).slice(0, 4)
}

// Use the SAME rule as your daily delta in update.v2:
// correct -> 5 + effectiveStreak*2 (but you were calculating streak from DB)
// wrong -> 0
//
// For now we’ll keep daily simple on the client:
// correct +5, wrong +0
// The server finalize should match this (deltaFor(correct) => 5 or 0).

const STREAK_CAP = 5

function dailyDeltaFor(correct: boolean, streakBefore: number) {
    if (!correct) return 0
    return 5 + Math.min(streakBefore, STREAK_CAP) * 2
}

const {
    xpDelta,
    mergingXp,
    readyForNext,
    triggerXp
} = useXpAnimation()

const { getAccessToken } = await useAuth()

const {
    loading,
    dailyLocked,
    requiredWords,
    currentWordCount,
    dailyCompleted,
    answeredCount,
    totalQuestions,
    correctCount,
    xpToday,
    questions,
    loadSession,
} = useDailySession()


const currentQuestion = computed(() =>
    questions.value.length
        ? questions.value[currentIndex.value]
        : null
)

const currentXp = ref<number>(0)
const currentStreak = ref<number>(0)

const { timeRemaining } = useCountdownToUtcMidnight()


function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

const options = ref<DailyWord[]>([])

async function selectAnswer(answer: string) {
    if (!currentQuestion.value || showResult.value) return

    selected.value = answer
    showResult.value = true

    const wordId = currentQuestion.value.id
    const correct = answer === currentQuestion.value.meaning

    if (correct) {
        playCorrectJingle()
    } else {
        playIncorrectJingle()
    }

    // prevent double-answering same word in this session (client guard)
    if (!answerLog.value.some(a => a.wordId === wordId)) {
        answerLog.value.push({ wordId, correct })

        answeredCount.value += 1
        if (correct) correctCount.value += 1

        const delta = dailyDeltaFor(correct, currentStreak.value ?? 0)

        xpToday.value += delta
        currentXp.value = Math.max(0, currentXp.value + delta)
        currentStreak.value = correct ? currentStreak.value + 1 : 0

        const isLastQuestion =
            answerLog.value.length >= questions.value.length

        triggerXp(delta, isLastQuestion)

        if (isLastQuestion && !dailyCompleted.value) {
            finishing.value = true
            try {
                const token = await getAccessToken()

                const res = await $fetch<{
                    daily: {
                        answeredCount: number
                        correctCount: number
                        xpEarned: number
                        totalQuestions: number
                    }
                }>('/api/daily/finalize', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: { answers: answerLog.value, mode: 'daily_meaning_quiz' }
                })

                answeredCount.value = res.daily.answeredCount
                correctCount.value = res.daily.correctCount
                xpToday.value = res.daily.xpEarned
                totalQuestions.value = res.daily.totalQuestions

                dailyCompleted.value = true

                await sleep(1300)
                showCompleteView.value = true
                // playQuizCompleteFanfareSong()

                if (res.daily.totalQuestions > 0) {
                    const percent = (res.daily.correctCount / res.daily.totalQuestions) * 100

                    if (percent >= 90) {
                        playQuizCompleteFanfareSong()
                    } else if (percent >= 50) {
                        playQuizCompleteOkaySong()
                    } else {
                        playQuizCompleteFailSong()
                    }
                }
            } catch (err) {
                console.error('Daily finalize failed', err)
                // TODO: show a retry button that calls /api/daily/finalize again
            } finally {
                finishing.value = false
            }
        }
    } else {
        // Already answered this word, do nothing
        return
    }
}

const progressPercent = computed(() => {
    const total = totalQuestions.value || questions.value.length
    if (!total) return 0
    const percent = (answeredCount.value / total) * 100
    return Math.min(Math.max(percent, 0), 100)
})

function nextQuestion() {
    if (currentIndex.value < questions.value.length - 1) {
        currentXp.value = 0
        currentStreak.value = 0
        currentIndex.value++
        selected.value = null
        showResult.value = false
        readyForNext.value = false
        mergingXp.value = false
        options.value = []
    }
}

async function fetchOptions(correct: DailyWord) {
    const token = await getAccessToken()

    const res = await $fetch('/api/daily/distractors', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { wordId: correct.id, limit: 3 }
    })

    return shuffleFisherYates([correct, ...res.distractors])
}

const percentage = computed(() =>
    totalQuestions.value
        ? Math.round((correctCount.value / totalQuestions.value) * 100)
        : 0
)

const animatedAccuracy = ref(0)
const animatedXpEarned = ref(0)
const completionAnimated = ref(false)

const incorrectCount = computed(() =>
    Math.max(0, totalQuestions.value - correctCount.value)
)

const resultHeroClass = computed(() => {
    if (percentage.value === 100) return 'result-3'
    if (percentage.value >= 70) return 'result-0'
    if (percentage.value >= 50) return 'result-2'
    return 'result-1'
})

const resultMeta = computed(() => {
    if (percentage.value === 100) {
        return { title: 'Perfect' }
    }

    if (percentage.value >= 70) {
        return { title: 'Great job' }
    }

    if (percentage.value >= 50) {
        return { title: 'Nice try' }
    }

    return { title: 'Keep practicing' }
})

const completionTiles = computed(() => [
    {
        label: 'Correct',
        value: correctCount.value,
        suffix: '',
        className: 'result-0'
    },
    {
        label: 'Incorrect',
        value: incorrectCount.value,
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

function animateCount(target: { value: number }, end: number, duration = 1200) {
    const start = target.value
    const startTime = performance.now()

    function tick(now: number) {
        const progress = Math.min((now - startTime) / duration, 1)
        target.value = Math.round(start + (end - start) * progress)

        if (progress < 1) {
            requestAnimationFrame(tick)
        }
    }

    requestAnimationFrame(tick)
}

function resetCompletionAnimations() {
    animatedAccuracy.value = 0
    animatedXpEarned.value = 0
    completionAnimated.value = false
}

watch(
    () => showCompleteView.value,
    (visible) => {
        if (!visible) return
        if (completionAnimated.value) return

        completionAnimated.value = true
        animateCount(animatedAccuracy, percentage.value, 2200)
        animateCount(animatedXpEarned, xpToday.value, 1000)
    }
)

onMounted(async () => {
    const token = await getAccessToken()
    await loadSession(token)

    // Reset per-run UI state
    currentIndex.value = 0
    selected.value = null
    showResult.value = false
    showCompleteView.value = dailyCompleted.value
    resetCompletionAnimations()

    // Only start fresh if we're actually doing the quiz now
    if (!dailyLocked.value && !dailyCompleted.value) {
        answeredCount.value = 0
        correctCount.value = 0
        xpToday.value = 0
        answerLog.value = []
    }
})

watch(currentQuestion, async (q) => {
    if (!q) return
    if (finishing.value || showCompleteView.value) return
    options.value = await fetchOptions(q)
}, { immediate: true })

watch(() => currentQuestion.value?.id, async (wordId) => {
    if (!wordId) return
    const token = await getAccessToken()
    const progressMap = await $fetch<Record<string, { xp: number; streak: number }>>(
        '/api/word-progress',
        { query: { wordIds: wordId }, headers: { Authorization: `Bearer ${token}` } }
    )
    currentXp.value = progressMap[wordId]?.xp ?? 0
    currentStreak.value = progressMap[wordId]?.streak ?? 0
}, { immediate: true })

watch(currentQuestion, () => {
    generateTileColors()
})

</script>

<template>
    <div class="max-w-xl mx-auto px-4 py-8">

        <div class="mb-6">
            <NuxtLink :to="`/`" class="text-black text-sm hover:underline">
                ← Back to Home
            </NuxtLink>
        </div>


        <h1 v-if="!showCompleteView && !finishing && currentQuestion" class="text-2xl font-semibold text-center mb-4">
            Daily Training
        </h1>

        <div v-if="loading" class="text-center py-10 text-gray-500">
            Loading daily training...
        </div>

        <div v-else>

            <div v-if="dailyLocked" class="shadow p-10 rounded-lg text-center" style="background-color:#A8CAE0;">

                <h2 class="text-xl font-semibold mb-4">
                    Daily Training Locked
                </h2>

                <p class="text-gray-700 mb-4">
                    You need to have quizzed yourself on at least {{ requiredWords }} words
                    to unlock Daily Training.
                </p>

                <div class="w-full bg-gray-200 h-3 rounded-full mb-4">
                    <div class="bg-purple-500 h-3 rounded-full transition-[width] duration-500 ease-out"
                        :style="{ width: (currentWordCount / requiredWords) * 100 + '%' }" />
                </div>

                <p class="text-sm text-gray-700 mb-6">
                    {{ currentWordCount }} / {{ requiredWords }} words tested
                </p>

                <NuxtLink to="/topics/quiz"
                    class="mt-2 inline-block text-gray-800 font-semibold px-6 py-3 transition-transform duration-150 hover:scale-[1.05] active:scale-[0.98]">
                    Test your self on more words first →
                </NuxtLink>
            </div>

            <div class="relative min-h-[700px]">
                <div v-if="!showCompleteView && !finishing && currentQuestion" class="flex items-center gap-3 mb-6">

                    <div class="flex-1 bg-gray-200 rounded-lg h-3 relative overflow-hidden">

                        <div :class="[
                            'h-3 rounded-lg transition-[width] duration-500 ease-out relative',
                            progressPercent > 80
                                ? 'bg-purple-400 animate-pulse shadow-[0_0_20px_rgba(168,85,247,0.9)]'
                                : 'bg-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.6)]'
                        ]" :style="{ width: progressPercent + '%' }">

                        </div>

                    </div>

                    <span class="text-sm text-gray-500 whitespace-nowrap">
                        {{ answeredCount }} / {{ totalQuestions }}
                    </span>

                </div>

                <div v-if="!showCompleteView && !finishing && currentQuestion" class="py-8 rounded-2xl transition-all">

                    <p class="text-3xl font-medium text-center mb-2">
                        {{ currentQuestion.word }}
                    </p>

                    <div class="flex flex-col items-center gap-2 mb-6">

                        <!-- XP Bar -->
                        <div class="w-40 h-2 bg-gray-200 rounded">
                            <div :class="[
                                'h-2 bg-green-500 rounded transition-[width] duration-500 ease-out',
                                mergingXp ? 'ring-2 ring-green-300' : ''
                            ]" :style="{ width: Math.min((currentXp ?? 0) / 1000 * 100, 100) + '%' }" />
                        </div>

                        <!-- XP Text + Delta -->
                        <div class="relative text-sm text-gray-500">
                            {{ currentXp ?? 0 }} XP

                            <transition name="xp-fall">
                                <span v-if="xpDelta !== null" :class="[
                                    'absolute left-full ml-2 font-semibold transition-all duration-200',
                                    xpDelta > 0 ? 'text-green-600' : 'text-red-600',
                                    mergingXp ? 'opacity-0 scale-75 -translate-y-2' : ''
                                ]">
                                    {{ xpDelta > 0 ? '+' + xpDelta : xpDelta }}
                                </span>
                            </transition>
                        </div>

                        <!-- Streak -->
                        <div class="h-5 flex items-center justify-center">
                            <span class="text-xs text-orange-500">
                                {{ currentStreak && currentStreak > 0 ? `${currentStreak} streak` : '' }}
                            </span>
                        </div>

                        <div class="text-center">
                            <AudioButton :key="currentQuestion.id" :src="`${cdnBase}/audio/${currentQuestion.id}.mp3`"
                                autoplay />
                        </div>
                    </div>

                    <div class="grid gap-4">

                        <button v-for="(option, i) in options" :key="option.id" @click="selectAnswer(option.meaning)"
                            class="rounded-lg px-6 py-4 text-center
           transition-all duration-300 ease-out
           shadow-sm active:scale-95 hover:brightness-110" :style="{
            backgroundColor:
                !showResult
                    ? tileColors[i]
                    : option.meaning === currentQuestion.meaning
                        ? '#BBF7D0'
                        : selected === option.meaning
                            ? '#FECACA'
                            : tileColors[i]
        }" :class="[
            showResult && option.meaning === currentQuestion.meaning && 'ring-2 ring-emerald-400',
            showResult && selected === option.meaning && option.meaning !== currentQuestion.meaning && 'animate-shake ring-2 ring-rose-400'
        ]">
                            {{ option.meaning }}
                        </button>

                    </div>

                    <transition name="next-fade">
                        <button v-if="showResult && readyForNext && currentIndex < questions.length - 1"
                            @click="nextQuestion"
                            class="mt-6 w-full bg-black text-white p-3 rounded-lg transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]">
                            Next
                        </button>
                    </transition>

                </div>

                <transition name="finalise-fade">
                    <div v-if="finishing"
                        class="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <div class="loader mb-6"></div>

                        <p class="text-lg font-semibold text-purple-600">
                            Finalising your score...
                        </p>

                        <p class="text-sm text-gray-500 mt-2">
                            Calculating XP & streak
                        </p>
                    </div>
                </transition>

                <!-- Completion block -->
                <!-- <transition name="complete-fade"> -->
                <!-- <div v-if="showCompleteView"
                        class="absolute inset-0 overflow-y-auto px-4 py-6 flex flex-col items-center text-center"> -->

                <!-- Title -->
                <!-- <h2 class="text-xl sm:text-2xl font-bold mb-6 tracking-wide">
                            Daily Exercise Complete!
                        </h2> -->

                <!-- Score Card -->
                <!-- <div class="w-full max-w-sm rounded-xl p-5 mb-2"> -->

                <!-- <p class="text-xs uppercase tracking-wide text-gray-500 mb-2">
                                Score
                            </p>

                            <div class="flex items-center justify-center gap-2 text-3xl font-bold">

                                <span class="text-[#7FB9D8]">
                                    {{ correctCount }} / {{ totalQuestions }}
                                </span>

                            </div> -->

                <!-- <div class="flex items-center justify-center gap-2 text-3xl font-bold">

                                <span :class="[
                                    percentage >= 90
                                        ? 'text-[#C48CC3]'
                                        : percentage >= 50
                                            ? 'text-[#DFA0D8]'
                                            : 'text-[#E9A7C6]'
                                ]">
                                    {{ percentage }}%
                                </span>

                            </div> -->
                <!-- </div> -->

                <!-- <div class="w-full max-w-sm rounded-xl p-5 mb-4">

                            <div class="flex items-center justify-center gap-2 text-3xl font-bold">

                                <span :class="[
                                    percentage >= 90
                                        ? 'text-[#C48CC3]'
                                        : percentage >= 50
                                            ? 'text-[#DFA0D8]'
                                            : 'text-[#E9A7C6]'
                                ]">
                                    {{ percentage }}%
                                </span>

                            </div>

                        </div> -->

                <!-- XP Card -->
                <!-- <div class="w-full max-w-sm p-5 mb-4">

                            <p class="text-xs uppercase tracking-wide text-gray-500 mb-2">
                                XP Earned
                            </p>

                            <p class="text-3xl font-bold text-emerald-500">
                                +{{ xpToday }} XP
                            </p>

                        </div> -->

                <!-- Countdown -->
                <!-- <div class="w-full max-w-sm p-5 mb-10">

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
                        </div> -->
                <!-- </div> -->
                <!-- </transition> -->


                <transition name="complete-fade">
                    <div v-if="showCompleteView" class="absolute inset-0 overflow-y-auto px-4 py-6">
                        <div class="space-y-6">
                            <transition name="card-fade" appear>
                                <div class="stat-card hero-card" :class="resultHeroClass">
                                    <p class="stat-label">
                                        Daily Exercise Complete
                                    </p>

                                    <h2 class="hero-title">
                                        {{ resultMeta.title }}
                                    </h2>

                                    <p class="hero-score">
                                        {{ animatedAccuracy }}%
                                    </p>

                                    <p class="hero-subtext">
                                        {{ correctCount }} / {{ totalQuestions }} correct
                                    </p>
                                </div>
                            </transition>

                            <transition-group name="card-fade" tag="div"
                                class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                                <div v-for="tile in completionTiles" :key="tile.label"
                                    class="stat-card hover:brightness-110" :class="tile.className">
                                    <p class="stat-label">
                                        {{ tile.label }}
                                    </p>

                                    <p class="stat-value">
                                        {{ tile.prefix ?? '' }}{{ tile.value }} {{ tile.suffix }}
                                    </p>
                                </div>
                            </transition-group>

                            <!-- <div class="stat-card result-2"> -->
                            <div class="text-center">
                                <p class="stat-label">
                                    Next daily unlocks in
                                </p>

                                <div class="countdown-pill mt-4">
                                    <span class="countdown-text brightness-125">
                                        {{ timeRemaining }}
                                    </span>
                                </div>
                            </div>

                            <div class="pt-2 space-y-3">
                                <NuxtLink to="/"
                                    class="block w-full rounded-xl text-black py-3 text-center font-medium hover:brightness-110 transition"
                                    style="background-color:#A8CAE0;">
                                    Back to home
                                </NuxtLink>

                                <NuxtLink to="/topics/quiz"
                                    class="block w-full rounded-xl text-gray-900 py-3 text-center font-medium hover:brightness-110 transition"
                                    style="background-color:rgba(244,205,39,0.35);">
                                    Explore more practice
                                </NuxtLink>
                            </div>
                        </div>
                    </div>
                </transition>
            </div>
        </div>
    </div>
</template>


<style scoped>
.finalise-fade-enter-active,
.finalise-fade-leave-active {
    transition: opacity 0.5s ease, transform 0.5s ease;
}

.finalise-fade-enter-from,
.finalise-fade-leave-to {
    opacity: 0;
    transform: translateY(10px) scale(0.97);
}

.complete-fade-enter-active {
    transition: opacity 0.7s cubic-bezier(.22, 1, .36, 1),
        transform 0.7s cubic-bezier(.22, 1, .36, 1);
}

.complete-fade-enter-from {
    opacity: 0;
    transform: translateY(12px);
}

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


.next-fade-enter-active {
    transition: opacity 0.18s ease-out, transform 0.18s ease-out;
}

.next-fade-leave-active {
    transition: opacity 0.15s ease-in, transform 0.15s ease-in;
}

.next-fade-enter-from {
    opacity: 0;
    transform: translateY(6px) scale(0.97);
}

.next-fade-enter-to {
    opacity: 1;
    transform: translateY(0px) scale(1);
}

.next-fade-leave-to {
    opacity: 0;
    transform: translateY(6px);
}

/* subtle animated shimmer */
.shimmer-layer {
    background: linear-gradient(110deg,
            transparent 25%,
            rgba(255, 255, 255, 0.5) 50%,
            transparent 75%);
    background-size: 200% 100%;
    animation: shimmer 2.5s infinite linear;
    mix-blend-mode: overlay;
}

@keyframes shimmer {
    0% {
        background-position: -200% 0;
    }

    100% {
        background-position: 200% 0;
    }
}

/* optional subtle breathing pulse */
@keyframes progressPulse {
    0% {
        box-shadow: 0 0 8px rgba(168, 85, 247, 0.4);
    }

    50% {
        box-shadow: 0 0 18px rgba(168, 85, 247, 0.8);
    }

    100% {
        box-shadow: 0 0 8px rgba(168, 85, 247, 0.4);
    }
}

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

.card-fade-enter-active {
    transition: opacity 0.4s ease, transform 0.4s ease;
}

.card-fade-enter-from {
    opacity: 0;
    transform: translateY(10px);
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

.countdown-pill {
    background: #111827;
    border-radius: 14px;
    padding: 0.9rem 1rem;
}

.countdown-text {
    font-size: 1.75rem;
    font-weight: 600;
    background: linear-gradient(90deg,
            #EAB8E4 0%,
            #A8CAE0 50%,
            #D6A3D1 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}
</style>
