<script setup lang="ts">
definePageMeta({
  middleware: ['topic-access-quiz'],
  ssr: false,
})

import { computed, ref, watch } from 'vue';

import {
  playCorrectJingle,
  playIncorrectJingle,
  playQuizCompleteFailSong,
  playQuizCompleteFanfareSong,
  playQuizCompleteOkaySong
} from '@/utils/sounds';

import { masteryXp } from '@/config/xp/helpers';
import { useQuizTimer } from '~/composables/quiz/useQuizTimer';
import { brandColours } from '~/utils/branding/helpers';

const openQuizResults = useQuizResults()
const route = useRoute()
const topicSlug = computed(() => route.params.topic as string)

const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

function getRandomizedAudioSrc(audioKey: string) {
  const voiceDirectories = shuffleFisherYates(['audio-male', 'audio-female'])
  const voiceDirectory = voiceDirectories[0]
  return `${cdnBase}/${voiceDirectory}/${audioKey}`
}
const playbackRate = ref(1)

const { getAccessToken } = await useAuth()

const { stop } = useGlobalAudio()

type QuizAnswer = { wordId: string; correct: boolean }

type WordProgress = {
  xp: number
  streak: number
}

type TopicQuizWord = {
  id: string
  word: string
  jyutping: string
  meaning: string
}

type TopicQuizQuestion = {
  wordId: string
  prompt: string
  options: string[]
  correctIndex: number
}

type TopicQuizPayload = {
  topic: string
  title: string
  description: string
  totalQuestions: number
  questions: TopicQuizQuestion[]
  progressMap: Record<string, WordProgress>
  wordsById: Record<string, TopicQuizWord>
  guestPreview?: boolean
}

const me = useMeStateV2()
const isGuestPreview = computed(() => quizData.value?.guestPreview === true)

const quizData = ref<TopicQuizPayload | null>(null)
const quizLoading = ref(true)
const quizLoadError = ref<string | null>(null)

const initialProgressMap = ref<Record<string, WordProgress>>({})

const answerLog = ref<QuizAnswer[]>([])

const wordProgressMap = ref<Record<string, WordProgress>>({})

const STREAK_CAP = 5
const WRONG_PENALTY = -12

const currentWord = computed(() => {
  const wordId = question.value?.wordId
  if (!wordId) return null
  return wordsById.value[wordId] ?? null
})

function deltaFor(correct: boolean, streakBefore: number) {
  if (!correct) return WRONG_PENALTY
  return 5 + Math.min(streakBefore, STREAK_CAP) * 2
}

const xpDelta = ref<number | null>(null)
const currentXp = ref<number | null>(null)
const currentStreak = ref<number | null>(null)

const current = ref(0)
const score = ref(0)
const answered = ref(false)
const selectedIndex = ref<number | null>(null)

const tileColors = ref<string[]>([])

const {
  elapsedMs,
  formattedElapsedTime,
  startTimer,
  stopTimer,
  freezeTimer,
  resetTimer,
} = useQuizTimer()

function generateTileColors() {
  tileColors.value = shuffleFisherYates(brandColours).slice(0, 4)
}

function resetQuizState() {
  current.value = 0
  score.value = 0
  answered.value = false
  selectedIndex.value = null
  answerLog.value = []
  wordProgressMap.value = {}
  xpDelta.value = null
  currentXp.value = null
  currentStreak.value = null
  initialProgressMap.value = {}
  resetTimer()
}

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

async function loadQuiz() {
  quizLoading.value = true
  quizLoadError.value = null
  quizData.value = null
  resetQuizState()

  try {

    const token = await getAccessToken();

    const res = await $fetch<TopicQuizPayload>(
      // `/api/topic/quiz/${topicSlug.value}`,
      `/api/topic/quiz/v2/${topicSlug.value}`,
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

    if (res.questions?.length) {
      startTimer()
    }
  } catch (err) {
    console.error('Load topic quiz failed', err)
    quizLoadError.value = 'Could not load quiz.'
  } finally {
    quizLoading.value = false
  }
}

onMounted(() => {
  watch([topicSlug, me.isLoggedIn], loadQuiz, { immediate: true })
})

const questions = computed(() => quizData.value?.questions ?? [])
const question = computed(() => questions.value[current.value] ?? null)
const wordsById = computed(() => quizData.value?.wordsById ?? {})

const pageTitle = computed(() => {
  return quizData.value?.title ?? topicSlug.value.replace('-', ' ')
})

const incorrectCount = computed(() => {
  return Math.max(0, questions.value.length - score.value)
})

const percentage = computed(() => {
  if (!questions.value.length) return 0
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

const currentWordAudioSrc = computed(() => {
  const wordId = question.value?.wordId
  if (!wordId) return null
  return getRandomizedAudioSrc(`${wordId}.mp3`)
})

let currentWordAudio: HTMLAudioElement | null = null

async function playCurrentWordAudio() {
  if (!currentWordAudioSrc.value) return

  try {
    currentWordAudio?.pause()
    currentWordAudio = new Audio(currentWordAudioSrc.value)
    currentWordAudio.playbackRate = playbackRate.value
    currentWordAudio.volume = 1
    await currentWordAudio.play()
  } catch (err) {
    console.warn('Word audio playback was blocked or failed', err)
  }
}

function answer(index: number) {
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

  void playCurrentWordAudio()

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
  currentWordAudio?.pause()
  currentWordAudio = null

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
    currentStreak.value = wordProgressMap.value[nextWordId]?.streak ?? 0
    currentXp.value = wordProgressMap.value[nextWordId]?.xp ?? 0
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
    missedQuestions: missedPracticeQuestions(questions.value, answerLog.value),
    retryTo: `/topic/quiz/vocabulary/word/start-quiz/${topicSlug.value}`,
    backTo: '/topics/quiz',
    review: {
      basePath: `/topic/word/${topicSlug.value}`,
      correct: reviewedWords(correctWords.value),
      incorrect: reviewedWords(missedWords.value),
    },
  }, userId ? { userId, mode: 'grind-topic', answers: answerLog.value } : undefined)
}

watch(
  () => question.value?.wordId,
  () => {
    generateTileColors()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  stop()
  stopTimer()
  currentWordAudio?.pause()
  currentWordAudio = null
})
</script>


<template>
  <main class="max-w-xl mx-auto px-4 py-16 space-y-8">

    <section class="text-center space-y-4">
      <QuizHeaderProgress v-if="showQuiz && (current + 1) <= questions.length"
        :label="pageTitle" :current="current + 1" :total="questions.length"
        :answered="answered" @advance="next" />

      <div v-if="quizLoading" class="stat-card hero-card result-2 space-y-4">
        <div class="spinner mx-auto" />
        <p class="stat-label">Loading</p>
        <h2 class="hero-title">Preparing your quiz...</h2>
      </div>

      <div v-else-if="quizLoadError" class="stat-card hero-card result-1 space-y-4">
        <p class="stat-label">Error</p>
        <h2 class="hero-title">{{ quizLoadError }}</h2>

        <button class="w-full rounded-xl font-medium text-black py-3 hover:brightness-110"
          style="background-color:#F4C2D7;" @click="loadQuiz">
          Try again
        </button>
      </div>

      <div v-else-if="showQuiz" class="space-y-6">

        <p class="text-4xl font-semibold min-h-[64px] flex items-center justify-center">
          {{ question.prompt }}
        </p>

        <div class="min-h-[50px] space-y-3">
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
                <span v-if="xpDelta !== null" class="absolute left-full ml-2 text-sm font-semibold pointer-events-none"
                  :class="xpDelta > 0 ? 'text-green-600' : 'text-red-600'">
                  {{ xpDelta > 0 ? '+' + xpDelta : xpDelta }}
                </span>
              </transition>
            </div>
          </div>

          <div class="h-5 flex items-center justify-center">
            <span v-if="currentStreak && currentStreak > 0" class="text-xs text-orange-500">
              {{ currentStreak }} streak
            </span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <button v-for="(option, i) in question.options" :key="i" class="answer-tile aspect-square rounded-xl flex items-center justify-center
              text-xl sm:text-lg md:text-xl lg:text-2xl font-semibold text-center p-6 select-none
              transition-all duration-300 ease-out shadow-sm active:scale-95" :style="{
                backgroundColor:
                  !answered
                    ? tileColors[i]
                    : i === question.correctIndex
                      ? '#BBF7D0'
                      : i === selectedIndex
                        ? '#FECACA'
                        : tileColors[i]
              }" :class="[
                !answered && 'hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg hover:brightness-110',
                answered && i === question.correctIndex && 'ring-2 ring-emerald-400',
                answered && i === selectedIndex && i !== question.correctIndex && 'animate-shake ring-2 ring-rose-400'
              ]" @click="answer(i)">
            {{ option }}
          </button>
        </div>

        <div class="h-10">
          <button v-if="answered"
            class="next-btn-blue w-full rounded-xl font-medium text-black text-lg py-3 hover:brightness-110"
            @click="next">
            {{ current + 1 === questions.length ? 'View results' : 'Next' }}
          </button>
        </div>
      </div>
    </section>
  </main>
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
