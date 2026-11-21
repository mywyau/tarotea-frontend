<script setup lang="ts">
definePageMeta({
  middleware: ['level-quiz-access'],
  ssr: false
})

import { generateAudioQuiz } from '@/utils/quiz/generateAudioQuiz'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import {
  playCorrectJingle,
  playIncorrectJingle,
  playQuizCompleteFailSong,
  playQuizCompleteFanfareSong,
  playQuizCompleteOkaySong
} from '@/utils/sounds'

import { masteryXp } from '@/config/xp/helpers'
import type { LevelData, Word } from '~/types/level/quiz/types'
import { brandColours } from '~/utils/branding/helpers'
import { isLevelId, levelTitles } from '~/utils/levels/levels'

type QuizAnswer = { wordId: string; correct: boolean }

const openQuizResults = useQuizResults()
const route = useRoute()
const slug = computed(() => route.params.slug as string)

if (!isLevelId(slug.value)) {
  throw createError({ statusCode: 404 })
}

const { getAccessToken } = await useAuth()
const { isLoggedIn, user } = useMeStateV2()
const { stop } = useGlobalAudio()

const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

function getRandomizedAudioSrc(audioKey: string) {
  const voiceDirectories = shuffleFisherYates(['audio-male', 'audio-female'])
  const voiceDirectory = voiceDirectories[0]
  return `${cdnBase}/${voiceDirectory}/${audioKey}`
}


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

const answerLog = ref<QuizAnswer[]>([])


const tileColors = ref<string[]>([])
const weakestIds = ref<string[]>([])

const current = ref(0)
const score = ref(0)
const answered = ref(false)
const selectedIndex = ref<number | null>(null)
const xpDelta = ref<number | null>(null)
const currentXp = ref<number | null>(null)
const currentStreak = ref<number | null>(null)

const wordProgressMap = ref<Record<string, { xp: number; streak: number }>>({})
const initialProgressMap = ref<Record<string, { xp: number; streak: number }>>({})

function resetQuizRunState() {
  answerLog.value = []
  current.value = 0
  score.value = 0
  answered.value = false
  selectedIndex.value = null
  xpDelta.value = null
  currentXp.value = null
  currentStreak.value = null
  initialProgressMap.value = {}
  wordProgressMap.value = {}
  elapsedMs.value = 0
  frozenElapsedMs.value = null
  quizStartedAt.value = null
  stopTimer()
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

const token = await getAccessToken()

const { data, error } = await useFetch<LevelData>(
  () =>
    `/api/vocab-quiz/v2/${slug.value}`,
  {
    key: () => `audio-quiz-${slug.value}-${isLoggedIn.value ? 'authed' : 'anon'}`,
    headers: token
      ? { Authorization: `Bearer ${token}` }
      : undefined,
    server: false
  }
)

const wordsForLevel = computed<Word[]>(() => {
  if (!data.value) return []
  return Object.values(data.value.categories).flat()
})

function generateTileColors() {
  tileColors.value = shuffleFisherYates(brandColours).slice(0, 4)
}

const weightedWords = computed(() => {
  const words = wordsForLevel.value

  if (!words.length) {
    return []
  }

  const totalQuestions = 20

  if (!weakestIds.value.length) {
    return shuffleFisherYates(words).slice(0, totalQuestions)
  }

  const weakestPool = shuffleFisherYates(
    words.filter(w => weakestIds.value.includes(w.id))
  )

  const nonWeakestPool = shuffleFisherYates(
    words.filter(w => !weakestIds.value.includes(w.id))
  )

  const weakestTarget = Math.floor(totalQuestions * weakestWordRatio)

  const selected: Word[] = []

  selected.push(...weakestPool.slice(0, weakestTarget))
  selected.push(
    ...nonWeakestPool.slice(0, totalQuestions - selected.length)
  )

  if (selected.length < totalQuestions) {
    const remaining = shuffleFisherYates(
      words.filter(w => !selected.some(s => s.id === w.id))
    )

    selected.push(
      ...remaining.slice(0, totalQuestions - selected.length)
    )
  }

  return shuffleFisherYates(selected)
})

const questions = computed(() =>
  weightedWords.value.length
    ? generateAudioQuiz(weightedWords.value)
    : []
)

const question = computed(() => questions.value[current.value])
const currentAudioSrc = computed(() =>
  question.value?.type === 'audio' ? getRandomizedAudioSrc(question.value.audioKey) : ''
)

const STREAK_CAP = 5
const WRONG_PENALTY = -12

function deltaFor(correct: boolean, streakBefore: number) {
  if (!correct) return WRONG_PENALTY
  return 5 + Math.min(streakBefore, STREAK_CAP) * 2
}

const incorrectCount = computed(() => {
  return Math.max(0, questions.value.length - score.value)
})

const percentage = computed(() => {
  const total = questions.value.length
  if (!total) return 0
  return (score.value / total) * 100
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
    .map(a => wordsForLevel.value.find(w => w.id === a.wordId))
    .filter(Boolean)
})

const missedWords = computed(() => {
  return answerLog.value
    .filter(a => !a.correct)
    .map(a => wordsForLevel.value.find(w => w.id === a.wordId))
    .filter(Boolean)
})

const hasQuestions = computed(() => questions.value.length > 0)


const showQuiz = computed(() => {
  return hasQuestions.value && current.value < questions.value.length
})

const isGuestMode = computed(() => !isLoggedIn.value)

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
    currentStreak.value = wordProgressMap.value[nextWordId]?.streak ?? 0
    currentXp.value = wordProgressMap.value[nextWordId]?.xp ?? 0
  }
}

const currentWord = computed(() => {
  const wordId = question.value?.wordId
  if (!wordId) return null
  return wordsForLevel.value.find(w => w.id === wordId) ?? null
})

onMounted(async () => {
  if (isGuestMode.value) {
    weakestIds.value = []
    return
  }

  try {
    const token = await getAccessToken()
    if (!token) {
      weakestIds.value = []
      return
    }

    const weakest = await $fetch<{ id: string }[]>(
      // '/api/word-progress/weakestV3',
      '/api/word-progress/weakestV4',
      {
        query: { level: slug.value },
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    weakestIds.value = weakest.map(w => w.id)
  } catch {
    weakestIds.value = []
  }
})

watch(
  () => questions.value,
  async (qs) => {
    resetQuizRunState()

    if (!qs.length) return

    const token = await getAccessToken()
    if (!token || isGuestMode.value) {
      const defaultProgress = Object.fromEntries(
        [...new Set(qs.map(q => q.wordId))].map(wordId => [wordId, { xp: 0, streak: 0 }])
      )

      wordProgressMap.value = defaultProgress
      initialProgressMap.value = defaultProgress

      const firstId = qs[0]?.wordId
      currentStreak.value = firstId ? (defaultProgress[firstId]?.streak ?? 0) : 0
      currentXp.value = firstId ? (defaultProgress[firstId]?.xp ?? 0) : 0
      startTimer()
      return
    }

    const wordIds = [...new Set(qs.map(q => q.wordId))]

    const progressMap = await $fetch<
      Record<string, { xp: number; streak: number }>
    >('/api/word-progress/v3', {
      query: { wordIds: wordIds.join(',') },
      headers: { Authorization: `Bearer ${token}` }
    })

    wordProgressMap.value = Object.fromEntries(
      Object.entries(progressMap).map(([wordId, progress]) => [
        wordId,
        { ...progress }
      ])
    )

    initialProgressMap.value = Object.fromEntries(
      Object.entries(progressMap).map(([wordId, progress]) => [
        wordId,
        { ...progress }
      ])
    )

    const firstId = qs[0]?.wordId
    currentStreak.value = progressMap[firstId]?.streak ?? 0
    currentXp.value = progressMap[firstId]?.xp ?? 0

    startTimer()
  },
  { immediate: true }
)

async function showWordResults() {
  const userId = user.value?.id
  const { earned, lost } = userId ? calculateQuizXpTotals() : { earned: 0, lost: 0 }
  const percent = percentage.value
  setTimeout(() => {
    if (percent >= 70) playQuizCompleteFanfareSong()
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
    retryTo: `/quiz/${slug.value}/audio/start-quiz`,
    backTo: '/quiz',
    review: {
      basePath: `/level/${slug.value}/word`,
      correct: reviewedWords(correctWords.value),
      incorrect: reviewedWords(missedWords.value),
    },
  }, userId ? { userId, mode: 'grind-level-audio', answers: answerLog.value } : undefined)
}

watch(
  () => question.value?.wordId,
  () => {
    generateTileColors()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  stopTimer()
  stop()
})

</script>

<template>
  <main class="audio-quiz-page max-w-xl mx-auto px-4">

    <section class="audio-quiz-shell text-center">
      <QuizHeaderProgress v-if="showQuiz && (current + 1) <= questions.length"
        :label="levelTitles[slug] ?? 'Level quiz'" :current="current + 1" :total="questions.length"
        :answered="answered" @advance="next" />

      <div v-if="showQuiz" class="audio-quiz-question">
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
                <span v-if="xpDelta !== null" class="absolute left-full ml-2 text-sm font-semibold pointer-events-none"
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
          <button v-for="(option, i) in question.options" :key="i" class="answer-tile audio-answer-tile rounded-xl flex items-center justify-center
              font-semibold text-center select-none
              transition-all duration-200 ease-out shadow-sm active:scale-95" :style="{
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
