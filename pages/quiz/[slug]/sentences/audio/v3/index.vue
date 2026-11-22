<script setup lang="ts">
definePageMeta({
  middleware: ['level-quiz-access'],
  ssr: false,
})

import { computed, onBeforeUnmount, ref, watch } from 'vue'

import {
  playCorrectJingle,
  playIncorrectJingle,
  playQuizCompleteFailSong,
  playQuizCompleteFanfareSong,
  playQuizCompleteOkaySong
} from '@/utils/sounds'

import { sentenceQuizXp } from '@/config/xp/helpers'

import type { SentenceQuizQuestion } from '~/utils/quiz/buildSentenceQuiz'

type AudioSentenceQuizQuestion = SentenceQuizQuestion & {
  audioKey: string
}

type SentenceQuizStartResponse = {
  sessionKey: string
  quiz: {
    mode: string
    level: string
    title: string
    totalQuestions: number
    questions: SentenceQuizQuestion[]
  }
  progress: Record<string, { xp: number; streak: number }>
}

type SentenceQuizFinalizeResponse = {
  quiz: {
    mode: string
    correctCount: number
    totalQuestions: number
    xpEarned: number
  }
}

type QuizAnswer = {
  wordId: string
  sentenceId: string
  correct: boolean
}

const openQuizResults = useQuizResults()
const route = useRoute()
const slug = computed(() => route.params.slug as string)
const { isLoggedIn } = useMeStateV2()

const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

const auth = await useAuth()
const { stop } = useGlobalAudio()

async function authedFetch<T>(
  url: string,
  options: Parameters<typeof $fetch<T>>[1] = {}
) {
  const token = await auth.getAccessToken()

  return $fetch<T>(url, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  })
}

function publicFetch<T>(
  url: string,
  options: Parameters<typeof $fetch<T>>[1] = {}
) {
  return $fetch<T>(url, options)
}

const {
  data,
  error,
  refresh,
  pending,
} = await useAsyncData(
  () => `level-sentences-audio-start-${slug.value}`,
  () =>
    (isLoggedIn.value ? authedFetch : publicFetch)<SentenceQuizStartResponse>(
      '/api/sentences/v3/start-v2',
      {
        query: {
          scope: 'level',
          slug: slug.value,
          format: 'word-listening',
        },
      }),
  {
    watch: [slug],
    server: false,
  }
)

const activeSessionKey = ref('')
const quizTitle = ref('Sentence Audio Quiz')
const questions = ref<AudioSentenceQuizQuestion[]>([])

const quizStartedAt = ref<number | null>(null)
const elapsedMs = ref(0)
const frozenElapsedMs = ref<number | null>(null)

let timerInterval: ReturnType<typeof setInterval> | null = null

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

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const displayedElapsedMs = computed(() => {
  return frozenElapsedMs.value ?? elapsedMs.value
})

const formattedElapsedTime = computed(() => {
  return formatDuration(displayedElapsedMs.value)
})

const hasQuestions = computed(() => questions.value.length > 0)

const current = ref(0)
const score = ref(0)
const answered = ref(false)
const selectedIndex = ref<number | null>(null)
const completionSoundPlayed = ref(false)

const xpDelta = ref<number | null>(null)
const currentXp = ref(0)
const currentStreak = ref(0)

const wordProgressMap = ref<Record<string, { xp: number; streak: number }>>({})

const STREAK_CAP = 5
const WRONG_PENALTY = -12

function deltaFor(correct: boolean, streakBefore: number) {
  if (!correct) return WRONG_PENALTY
  return sentenceQuizXp + Math.min(streakBefore, STREAK_CAP) * 2
}

const question = computed(() => questions.value[current.value])
const currentAudioSrc = computed(() =>
  question.value ? `${cdnBase}/audio/${question.value.audioKey}` : ''
)


const answerLog = ref<QuizAnswer[]>([])
const finishing = ref(false)
const totalXpEarned = ref(0)
const totalXpLost = ref(0)
const initialProgressMap = ref<Record<string, { xp: number; streak: number }>>({})

const incorrectCount = computed(() => {
  return Math.max(0, questions.value.length - score.value)
})

const progressPercent = computed(() => {
  const total = questions.value.length
  if (!total) return 0
  const position = Math.min(current.value + 1, total)
  return Math.round((position / total) * 100)
})

const quizFinished = computed(() => {
  return hasQuestions.value && current.value >= questions.value.length
})

const showCalculating = computed(() => {
  return quizFinished.value && finishing.value
})

const showResults = computed(() => {
  return quizFinished.value && !finishing.value
})

const showQuiz = computed(() => {
  return hasQuestions.value && current.value < questions.value.length
})

const MIN_CALCULATING_MS = 1800

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function calculateQuizXpTotals() {
  const localProgress: Record<string, { xp: number; streak: number }> = Object.fromEntries(
    Object.entries(initialProgressMap.value).map(([wordId, progress]) => [
      wordId,
      { ...progress }
    ])
  )

  let earned = 0
  let lost = 0

  for (const quizAnswer of answerLog.value) {
    const prev = localProgress[quizAnswer.wordId] ?? { xp: 0, streak: 0 }
    const delta = deltaFor(quizAnswer.correct, prev.streak)
    const nextXp = Math.max(0, prev.xp + delta)
    const appliedDelta = nextXp - prev.xp

    if (appliedDelta > 0) {
      earned += appliedDelta
    } else if (appliedDelta < 0) {
      lost += Math.abs(appliedDelta)
    }

    localProgress[quizAnswer.wordId] = {
      xp: nextXp,
      streak: quizAnswer.correct ? prev.streak + 1 : 0
    }
  }

  return { earned, lost }
}

function resetQuizStateFromStartPayload(payload: SentenceQuizStartResponse) {
  stop()
  stopTimer()

  current.value = 0
  score.value = 0
  answered.value = false
  selectedIndex.value = null
  completionSoundPlayed.value = false
  answerLog.value = []
  finishing.value = false
  totalXpEarned.value = 0
  totalXpLost.value = 0
  xpDelta.value = null
  elapsedMs.value = 0
  frozenElapsedMs.value = null
  quizStartedAt.value = null

  wordProgressMap.value = { ...(payload.progress ?? {}) }
  initialProgressMap.value = Object.fromEntries(
    Object.entries(payload.progress ?? {}).map(([wordId, progress]) => [
      wordId,
      { ...progress }
    ])
  )

  const firstWordId = payload.quiz.questions[0]?.wordId
  currentXp.value = firstWordId
    ? wordProgressMap.value[firstWordId]?.xp ?? 0
    : 0
  currentStreak.value = firstWordId
    ? wordProgressMap.value[firstWordId]?.streak ?? 0
    : 0

  if (payload.quiz.questions?.length) {
    startTimer()
  }
}

async function finalizeQuiz() {
  if (finishing.value) return
  const { earned, lost } = calculateQuizXpTotals()
  totalXpEarned.value = earned
  totalXpLost.value = lost

  if (!isLoggedIn.value) {
    return
  }
  if (!activeSessionKey.value) return

  finishing.value = true

  try {
    await Promise.all([
      authedFetch<SentenceQuizFinalizeResponse>(
        '/api/sentences/v3/finalize',
        {
          method: 'POST',
          body: {
            sessionKey: activeSessionKey.value,
            answers: answerLog.value,
          },
        }),
      sleep(MIN_CALCULATING_MS),
    ])

    totalXpEarned.value = earned
    totalXpLost.value = lost
  } catch (err) {
    console.error('Sentence audio quiz finalize failed', err)
  } finally {
    finishing.value = false
  }
}

async function answer(index: number) {
  if (answered.value) return
  if (!question.value) return

  selectedIndex.value = index
  answered.value = true

  const correct = index === question.value.correctIndex

  answerLog.value.push({
    wordId: question.value.wordId,
    sentenceId: question.value.sentenceId,
    correct,
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

  wordProgressMap.value[wordId] = {
    xp: newXp,
    streak: newStreak,
  }

  xpDelta.value = delta
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

    if (answerLog.value.length > 0) {
      await finalizeQuiz()
    }
    return
  }

  const nextWordId = questions.value[current.value]?.wordId
  if (nextWordId) {
    currentXp.value = wordProgressMap.value[nextWordId]?.xp ?? 0
    currentStreak.value = wordProgressMap.value[nextWordId]?.streak ?? 0
  }

  xpDelta.value = null
}

const percentage = computed(() => {
  const total = questions.value.length
  if (!total) return 0
  return (score.value / total) * 100
})

watch(
  () => showResults.value,
  (visible) => {
    if (!visible) return

    stop()

    if (!completionSoundPlayed.value) {
      completionSoundPlayed.value = true

      setTimeout(() => {
        if (percentage.value >= 80) {
          playQuizCompleteFanfareSong()
        } else if (percentage.value >= 50) {
          playQuizCompleteOkaySong()
        } else {
          playQuizCompleteFailSong()
        }
      }, 250)
    }

    void openQuizResults({
      title: 'Sentence Audio Quiz Complete',
      correct: score.value,
      incorrect: incorrectCount.value,
      elapsed: formattedElapsedTime.value,
      xpEarned: totalXpEarned.value,
      xpLost: totalXpLost.value,
      missedQuestions: missedPracticeQuestions(questions.value, answerLog.value, true),
      retryTo: `/quiz/${slug.value}/sentences/audio/start-quiz`,
      backTo: '/quiz',
    })
  }
)

watch(
  () => data.value,
  (value) => {
    if (!value) return

    activeSessionKey.value = value.sessionKey
    quizTitle.value = value.quiz.title ?? 'Sentence Audio Quiz'
    questions.value = (value.quiz.questions ?? []).map((q) => ({
      ...q,
      audioKey: `${q.sentenceId}.mp3`,
    }))

    resetQuizStateFromStartPayload(value)
  },
  { immediate: true }
)

watch(
  () => slug.value,
  () => {
    stop()
    stopTimer()
    activeSessionKey.value = ''
    quizTitle.value = 'Sentence Audio Quiz'
    questions.value = []
    current.value = 0
    score.value = 0
    answered.value = false
    selectedIndex.value = null
    completionSoundPlayed.value = false
    answerLog.value = []
    finishing.value = false
    totalXpEarned.value = 0
    totalXpLost.value = 0
    wordProgressMap.value = {}
    initialProgressMap.value = {}
    currentXp.value = 0
    currentStreak.value = 0
    xpDelta.value = null
    elapsedMs.value = 0
    frozenElapsedMs.value = null
    quizStartedAt.value = null
  }
)

onBeforeUnmount(() => {
  stop()
  stopTimer()
})
</script>

<template>
  <main class="max-w-3xl mx-auto px-4 pt-16 pb-32 space-y-8">
    
    <section class="text-center space-y-4">

      <QuizHeaderProgress v-if="showQuiz" sentence-quiz :label="quizTitle" :current="current + 1"
        :total="questions.length" :answered="answered" @advance="next" />

      <div v-if="pending" class="py-12 text-gray-500">
        Loading quiz...
      </div>

      <div v-else-if="error" class="space-y-4 py-12">
        <p class="text-red-500">
          Failed to load sentence audio quiz
        </p>

        <button class="next-btn-blue rounded-xl font-medium text-black px-6 py-2 hover:brightness-110"
          @click="refresh()">
          Retry
        </button>
      </div>

      <template v-else>
        <div v-if="showQuiz" class="space-y-6">
          <div class="space-y-6">
            <SentenceListeningQuestion :key="question.sentenceId" :question="question" :src="currentAudioSrc"
              :selected-index="selectedIndex" :xp="currentXp" :xp-delta="xpDelta" :streak="currentStreak" @answer="answer" />

            <div class="h-10 mt-6">
              <button v-if="answered"
                class="next-btn-blue w-full rounded-xl font-medium text-black text-lg py-3 hover:brightness-110"
                @click="next">
                {{ current + 1 === questions.length ? 'View results' : 'Next' }}
              </button>
            </div>
          </div>
        </div>

        <p v-if="!hasQuestions">No listening questions are available for this level.</p>

        <transition name="fade-scale" mode="out-in">
          <div v-if="showCalculating" key="calculating" class="stat-card hero-card result-2 space-y-4">
            <div class="spinner mx-auto" />

            <p class="stat-label">
              Calculating
            </p>

            <h2 class="hero-title">
              Updating your XP...
            </h2>

            <p class="hero-subtext">
              Saving your sentence audio quiz progress
            </p>
          </div>

        </transition>
      </template>
    </section>
  </main>

</template>


<style scoped>
.level-heading {
  font-size: 1.3rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(0, 0, 0);
}

.level-subheading {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.65);
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
