<script setup lang="ts">
definePageMeta({
    middleware: ['topic-access-quiz'],
    ssr: false,
})

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import {
    playCorrectJingle,
    playIncorrectJingle,
    playQuizCompleteFailSong,
    playQuizCompleteFanfareSong,
    playQuizCompleteOkaySong
} from '@/utils/sounds';

import { masteryXp } from '@/config/xp/helpers';
import { brandColours } from '~/utils/branding/helpers';

type TopicWord = {
    id: string
    word: string
    jyutping: string
    meaning: string
}

type WordProgress = {
    xp: number
    streak: number
}

type AudioQuizQuestion = {
    type: 'audio'
    wordId: string
    audioKey: string
    options: string[]
    correctIndex: number
}

type TopicAudioQuizPayload = {
    topic: string
    title: string
    description: string
    totalQuestions: number
    questions: AudioQuizQuestion[]
    progressMap: Record<string, WordProgress>
    wordsById: Record<string, TopicWord>
    guestPreview?: boolean
}

type QuizAnswer = {
    wordId: string
    correct: boolean
}

const openQuizResults = useQuizResults()
const route = useRoute()
const slug = computed(() => route.params.topic as string)



function getRandomizedAudioSrc(audioKey: string) {
    const voiceDirectories = shuffleFisherYates(['audio-male', 'audio-female'])
    const voiceDirectory = voiceDirectories[0]
    return `/api/lesson-audio/${voiceDirectory}/${audioKey}`
}

const { stop } = useGlobalAudio()
const { getAccessToken } = await useAuth()
const me = useMeStateV2()
const isGuestPreview = computed(() => quizData.value?.guestPreview === true)


const currentWord = computed(() => {
    const wordId = question.value?.wordId
    if (!wordId) return null
    return wordsById.value[wordId] ?? null
})

function calculateQuizXpTotals() {
    const localProgress: Record<string, WordProgress> = Object.fromEntries(
        Object.entries(initialProgressMap.value).map(([wordId, progress]) => [
            wordId,
            { ...progress }
        ])
    )

    let earned = 0
    let lost = 0

    for (const answer of answerLog.value) {
        const prev = localProgress[answer.wordId] ?? { xp: 0, streak: 0 }
        const delta = deltaFor(answer.correct, prev.streak)
        const nextXp = Math.max(0, prev.xp + delta)
        const appliedDelta = nextXp - prev.xp

        if (appliedDelta > 0) {
            earned += appliedDelta
        } else if (appliedDelta < 0) {
            lost += Math.abs(appliedDelta)
        }

        localProgress[answer.wordId] = {
            xp: nextXp,
            streak: answer.correct ? prev.streak + 1 : 0
        }
    }

    return { earned, lost }
}

const quizData = ref<TopicAudioQuizPayload | null>(null)
const quizLoading = ref(false)
const quizLoadError = ref<string | null>(null)

const current = ref(0)
const score = ref(0)
const answered = ref(false)
const selectedIndex = ref<number | null>(null)

const currentXp = ref<number | null>(null)
const currentStreak = ref<number | null>(null)
const xpDelta = ref<number | null>(null)

const answerLog = ref<QuizAnswer[]>([])


const wordProgressMap = ref<Record<string, WordProgress>>({})
const initialProgressMap = ref<Record<string, WordProgress>>({})

const tileColors = ref<string[]>([])
const quizStartedAt = ref<number | null>(null)
const elapsedMs = ref(0)
const frozenElapsedMs = ref<number | null>(null)

let timerInterval: ReturnType<typeof setInterval> | null = null

const STREAK_CAP = 5
const WRONG_PENALTY = -12

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
    }
}

function startTimer() {
    stopTimer()
    quizStartedAt.value = Date.now()
    elapsedMs.value = 0
    frozenElapsedMs.value = null

    timerInterval = setInterval(() => {
        if (quizStartedAt.value !== null) {
            elapsedMs.value = Date.now() - quizStartedAt.value
        }
    }, 250)
}

function freezeTimer() {
    if (quizStartedAt.value === null) return

    const finalMs = Date.now() - quizStartedAt.value
    elapsedMs.value = finalMs
    frozenElapsedMs.value = finalMs
    stopTimer()
}

function resetTimer() {
    stopTimer()
    quizStartedAt.value = null
    elapsedMs.value = 0
    frozenElapsedMs.value = null
}

function formatDuration(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const displayedElapsedMs = computed(() => frozenElapsedMs.value ?? elapsedMs.value)

const formattedElapsedTime = computed(() => {
    if (quizStartedAt.value === null && frozenElapsedMs.value === null) {
        return '--'
    }

    return formatDuration(displayedElapsedMs.value)
})

function generateTileColors() {
    tileColors.value = shuffleFisherYates(brandColours).slice(0, 4)
}

function deltaFor(correct: boolean, streakBefore: number) {
    if (!correct) return WRONG_PENALTY
    return 5 + Math.min(streakBefore, STREAK_CAP) * 2
}

function resetQuizState() {
    current.value = 0
    score.value = 0
    answered.value = false
    selectedIndex.value = null
    answerLog.value = []
    wordProgressMap.value = {}
    initialProgressMap.value = {}
    currentXp.value = null
    currentStreak.value = null
    xpDelta.value = null
    resetTimer()
}

async function loadQuiz() {
    quizLoading.value = true
    quizLoadError.value = null
    quizData.value = null
    resetQuizState()

    try {
        const token = await getAccessToken()

        const res = await $fetch<TopicAudioQuizPayload>(
            // `/api/topic/audio-quiz/${slug.value}`,
            `/api/topic/audio-quiz/v2/${slug.value}`,
            token
                ? {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
                : undefined
        )

        quizData.value = res

        wordProgressMap.value = Object.fromEntries(
            Object.entries(res.progressMap).map(([wordId, progress]) => [
                wordId,
                { ...progress }
            ])
        )

        initialProgressMap.value = Object.fromEntries(
            Object.entries(res.progressMap).map(([wordId, progress]) => [
                wordId,
                { ...progress }
            ])
        )

        const firstId = res.questions[0]?.wordId
        currentStreak.value = firstId
            ? (res.progressMap[firstId]?.streak ?? 0)
            : 0
        currentXp.value = firstId
            ? (res.progressMap[firstId]?.xp ?? 0)
            : 0
        startTimer()
    } catch (err) {
        console.error('Load topic audio quiz failed', err)
        quizLoadError.value = 'Could not load audio quiz.'
    } finally {
        quizLoading.value = false
    }
}

onMounted(() => {
    watch(
        () => [slug.value, me.isLoggedIn.value],
        () => {
            void loadQuiz()
        },
        { immediate: true }
    )
})

const questions = computed(() => quizData.value?.questions ?? [])
const question = computed(() => questions.value[current.value] ?? null)
const currentAudioSrc = computed(() =>
    question.value?.type === 'audio' ? getRandomizedAudioSrc(question.value.audioKey) : ''
)
const wordsById = computed(() => quizData.value?.wordsById ?? {})

const pageTitle = computed(() => {
    return quizData.value?.title ?? slug.value
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
})

const incorrectCount = computed(() => {
    return Math.max(0, questions.value.length - score.value)
})

const percentage = computed(() => {
    if (questions.value.length === 0) return 0
    return (score.value / questions.value.length) * 100
})

const hasQuestions = computed(() => questions.value.length > 0)


const showQuiz = computed(() => {
    return !quizLoading.value &&
        !quizLoadError.value &&
        hasQuestions.value &&
        current.value < questions.value.length
})

const progressPercent = computed(() => {
    const total = questions.value.length
    if (!total) return 0
    const position = Math.min(current.value + 1, total)
    return Math.round((position / total) * 100)
})

const correctWords = computed(() => {
    return answerLog.value
        .filter(a => a.correct)
        .map(a => wordsById.value[a.wordId])
        .filter(Boolean)
})

const missedWords = computed(() => {
    return answerLog.value
        .filter(a => !a.correct)
        .map(a => wordsById.value[a.wordId])
        .filter(Boolean)
})

async function answer(index: number) {
    if (answered.value) return
    if (!question.value) return

    selectedIndex.value = index
    answered.value = true

    const correct = index === question.value.correctIndex

    answerLog.value.push({
        wordId: question.value.wordId,
        correct
    })

    if (correct) {
        score.value++
        playCorrectJingle()
    } else {
        playIncorrectJingle()
    }

    const wordId = question.value.wordId
    const prev = wordProgressMap.value[wordId] ?? { xp: 0, streak: 0 }

    const delta = deltaFor(correct, prev.streak)
    const newStreak = correct ? prev.streak + 1 : 0
    const newXp = Math.max(0, prev.xp + delta)
    const appliedDelta = newXp - prev.xp

    wordProgressMap.value[wordId] = {
        xp: newXp,
        streak: newStreak
    }

    xpDelta.value = appliedDelta
    currentXp.value = newXp
    currentStreak.value = newStreak

    setTimeout(() => {
        xpDelta.value = null
    }, 1000)
}

async function next() {
    if (!answered.value || !showQuiz.value) return
    stop()
    answered.value = false
    selectedIndex.value = null

    current.value++

    if (current.value >= questions.value.length) {
        freezeTimer()
        await showWordResults()
        return
    }

    const nextWordId = questions.value[current.value]?.wordId

    if (nextWordId) {
        currentStreak.value =
            wordProgressMap.value[nextWordId]?.streak ?? 0

        currentXp.value =
            wordProgressMap.value[nextWordId]?.xp ?? 0
    }
}

async function showWordResults() {
    const userId = isGuestPreview.value ? undefined : me.user.value?.id
    const { earned, lost } = userId ? calculateQuizXpTotals() : { earned: 0, lost: 0 }
    const percent = percentage.value
    setTimeout(() => {
        if (percent >= 80) playQuizCompleteFanfareSong()
        else if (percent >= 50) playQuizCompleteOkaySong()
        else playQuizCompleteFailSong()
    }, 250)

    await openQuizResults({
        title: 'Quiz Complete',
        correct: score.value,
        incorrect: incorrectCount.value,
        elapsed: formattedElapsedTime.value,
        xpEarned: earned,
        xpLost: lost,
        missedQuestions: missedPracticeQuestions(questions.value, answerLog.value, true),
        retryTo: `/topic/quiz/vocabulary/audio/${slug.value}/start-quiz`,
        backTo: '/topics/quiz',
        review: {
            basePath: `/topic/word/${slug.value}`,
            correct: reviewedWords(correctWords.value),
            incorrect: reviewedWords(missedWords.value),
        },
    }, userId ? { userId, mode: 'grind-topic-audio', answers: answerLog.value } : undefined)
}

watch(
    () => question.value?.wordId,
    () => {
        generateTileColors()
    },
    { immediate: true }
)

onUnmounted(() => {
    stopTimer()
})
</script>


<template>
    <main class="audio-quiz-page max-w-xl mx-auto px-4">

        <section class="audio-quiz-shell text-center">
            <QuizHeaderProgress v-if="showQuiz && (current + 1) <= questions.length"
                :label="pageTitle" :current="current + 1" :total="questions.length"
                :answered="answered" @advance="next" />

            <div v-if="quizLoading" class="stat-card hero-card result-2 space-y-4">
                <div class="spinner mx-auto" />
                <p class="stat-label">Loading</p>
                <h2 class="hero-title">Preparing your audio quiz...</h2>
            </div>

            <div v-else-if="quizLoadError" class="stat-card hero-card result-1 space-y-4">
                <p class="stat-label">Error</p>
                <h2 class="hero-title">{{ quizLoadError }}</h2>

                <button class="w-full rounded-xl font-medium text-black py-3 hover:brightness-110"
                    style="background-color:#F4C2D7;" @click="loadQuiz">
                    Try again
                </button>
            </div>

            <div v-else-if="showQuiz" class="audio-quiz-question">

                <div class="audio-quiz-prompt flex flex-col items-center justify-center gap-2">
                    <p v-if="answered && currentWord" class="text-4xl font-semibold">
                        {{ currentWord.word }}
                    </p>

                    <p v-else class="font-semibold">
                        Which word did you hear?
                    </p>

                    <p v-if="answered && currentWord?.jyutping" class="text-sm text-gray-500">
                        {{ currentWord.jyutping }}
                    </p>

                    <p v-if="answered && currentWord?.meaning" class="text-sm text-gray-700">
                        {{ currentWord.meaning }}
                    </p>
                </div>

                <div class="audio-quiz-xp">
                    <div class="flex items-center justify-center gap-3">
                        <div class="w-32 h-1 bg-gray-200 rounded">
                            <div class="h-1 bg-green-500 rounded transition-all duration-500"
                                :style="{ width: Math.min((currentXp ?? 0) / masteryXp * 100, 100) + '%' }" />
                        </div>

                        <div class="relative flex items-center">
                            <span class="text-sm text-gray-500 whitespace-nowrap">
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

                    <div class="audio-quiz-streak flex items-center justify-center">
                        <span v-if="currentStreak && currentStreak > 0" class="text-xs text-orange-500">
                            {{ currentStreak }} streak
                        </span>
                    </div>
                </div>

                <div class="audio-answer-grid grid grid-cols-2">
                    <button v-for="(option, i) in question?.options ?? []" :key="i" class="answer-tile audio-answer-tile rounded-xl flex items-center justify-center
        font-semibold text-center select-none
        transition-all duration-300 ease-out shadow-sm active:scale-95" :style="{
            backgroundColor:
                !answered
                    ? tileColors[i]
                    : i === question?.correctIndex
                        ? '#BBF7D0'
                        : i === selectedIndex
                            ? '#FECACA'
                            : tileColors[i]
        }" :class="[
            !answered && 'hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg hover:brightness-110',
            answered && i === question?.correctIndex && 'ring-2 ring-emerald-400',
            answered && i === selectedIndex && i !== question?.correctIndex && 'animate-shake ring-2 ring-rose-400'
        ]" @click="answer(i)">
                        {{ option }}
                    </button>
                </div>

                <div class="audio-next-slot">
                    <button v-if="answered"
                        class="next-btn-blue audio-next-button w-full rounded-xl font-medium text-black hover:brightness-110"
                        @click="next">
                        {{ current + 1 === questions.length ? 'View results' : 'Next' }}
                    </button>
                </div>
            </div>
        </section>
    </main>

    <FloatingAudioButton v-if="showQuiz && question?.type === 'audio'" :key="question.audioKey"
        :src="currentAudioSrc" />
</template>

<style scoped>
.xp-fall-enter-active {
    transition: transform 0.6s ease, opacity 0.6s ease;
}

.xp-fall-leave-active {
    transition: transform 0.4s ease, opacity 0.4s ease;
}

.xp-fall-enter-from {
    opacity: 0;
    transform: translateY(-10px) scale(0.9);
}

.xp-fall-enter-to {
    opacity: 1;
    transform: translateY(0px) scale(1);
}

.xp-fall-leave-to {
    opacity: 0;
    transform: translateY(35px) scale(0.95);
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

.result-word-card:hover {
    transform: none;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
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

.result-4 {
    background: rgba(196, 181, 253, 0.4);
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

.next-btn-blue {
    background: rgb(126, 147, 255);
}
</style>
