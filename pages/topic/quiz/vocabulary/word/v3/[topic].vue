<script setup lang="ts">
definePageMeta({
  middleware: ['topic-access-quiz'],
  ssr: true,
})

import type { TopicData } from '@/types/topic'
import { computed, onMounted, ref, watch } from 'vue'

import {
  playCorrectJingle,
  playIncorrectJingle,
  playQuizCompleteFailSong,
  playQuizCompleteFanfareSong,
  playQuizCompleteOkaySong
} from '@/utils/sounds'

import { buildTopicQuiz } from '~/utils/quiz/buildTopicQuiz'
import { masteryXp } from '~/utils/xp/helpers'
import { brandColours } from '~/utils/branding/helpers'

const route = useRoute()
const topicSlug = computed(() => route.params.topic as string)

const { getAccessToken } = await useAuth()

type QuizAnswer = { wordId: string; correct: boolean }

const answerLog = ref<QuizAnswer[]>([])
const finishing = ref(false)
const totalXpEarned = ref<number>(0)

const wordProgressMap = ref<
  Record<string, { xp: number; streak: number }>
>({})

const STREAK_CAP = 5
const WRONG_PENALTY = -12
const MIN_CALCULATING_MS = 1800

function deltaFor(correct: boolean, streakBefore: number) {
  if (!correct) return WRONG_PENALTY
  return 5 + Math.min(streakBefore, STREAK_CAP) * 2
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const xpDelta = ref<number | null>(null)
const currentXp = ref<number | null>(null)
const currentStreak = ref<number | null>(null)

const animatedAccuracy = ref(0)
const animatedXpEarned = ref(0)
const completionAnimated = ref(false)
const completionSoundPlayed = ref(false)

const { stop } = useGlobalAudio()

const { data } = await useFetch<TopicData>(
  () => `/api/index/topics/${topicSlug.value}`,
  {
    key: () => `topic-quiz-${topicSlug.value}`,
    server: true,
    credentials: 'include'
  }
)

const wordsForTopic = computed(() => {
  if (!data.value) return []
  return Object.values(data.value.categories).flat()
})

const current = ref(0)
const score = ref(0)
const answered = ref(false)
const selectedIndex = ref<number | null>(null)
    
const tileColors = ref<string[]>([])

function generateTileColors() {
  tileColors.value = shuffleFisherYates(brandColours).slice(0, 4)
}

const weakestIds = ref<string[]>([])

const weightedWords = computed(() => {
  const words = wordsForTopic.value
  if (!words.length) return []

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

  const weakestTarget = Math.floor(totalQuestions * 0.7)

  const selected: typeof words = []

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
    ? buildTopicQuiz(weightedWords.value)
    : []
)

const question = computed(() => questions.value[current.value])

const accuracy = computed(() => {
  if (!questions.value.length) return 0
  return Math.round((score.value / questions.value.length) * 100)
})

const incorrectCount = computed(() => {
  return Math.max(0, questions.value.length - score.value)
})

const percentage = computed(() => {
  if (!questions.value.length) return 0
  return (score.value / questions.value.length) * 100
})

const hasQuestions = computed(() => questions.value.length > 0)

const quizFinished = computed(() => {
  return hasQuestions.value && current.value >= questions.value.length
})

const showQuiz = computed(() => {
  return hasQuestions.value && current.value < questions.value.length
})

const showCalculating = computed(() => {
  return quizFinished.value && finishing.value
})

const showResults = computed(() => {
  return quizFinished.value && !finishing.value
})

const progressPercent = computed(() => {
  const total = questions.value.length
  if (!total) return 0
  const position = Math.min(current.value + 1, total)
  return Math.round((position / total) * 100)
})

const resultHeroClass = computed(() => {
  if (accuracy.value === 100) return 'result-3'
  if (accuracy.value >= 70) return 'result-0'
  if (accuracy.value >= 50) return 'result-2'
  return 'result-1'
})

const resultMeta = computed(() => {
  if (accuracy.value === 100) {
    return { title: 'Perfect' }
  }

  if (accuracy.value >= 70) {
    return { title: 'Great job' }
  }

  if (accuracy.value >= 50) {
    return { title: 'Nice try' }
  }

  return { title: 'Keep practicing' }
})

const correctWords = computed(() => {
  return answerLog.value
    .filter(a => a.correct)
    .map(a => wordsForTopic.value.find(w => w.id === a.wordId))
    .filter(Boolean)
})

const missedWords = computed(() => {
  return answerLog.value
    .filter(a => !a.correct)
    .map(a => wordsForTopic.value.find(w => w.id === a.wordId))
    .filter(Boolean)
})

const completionTiles = computed(() => [
  {
    label: 'Correct',
    value: score.value,
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

function resetCompletionAnimations() {
  animatedAccuracy.value = 0
  animatedXpEarned.value = 0
  completionAnimated.value = false
}

function runCompletionAnimations() {
  animateCount(animatedAccuracy, accuracy.value, 2300)
}

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

  wordProgressMap.value[wordId] = {
    xp: newXp,
    streak: newStreak
  }

  xpDelta.value = delta
  currentXp.value = newXp
  currentStreak.value = newStreak

  setTimeout(() => {
    xpDelta.value = null
  }, 1000)
}

async function finalizeTopicQuiz() {
  if (finishing.value) return
  finishing.value = true

  try {
    const token = await getAccessToken()

    const [res] = await Promise.all([
      $fetch<{
        quiz: {
          correctCount: number
          totalQuestions: number
          xpEarned: number
        }
      }>('/api/quiz/grind/finalize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: {
          topic: topicSlug.value,
          answers: answerLog.value
        }
      }),
      sleep(MIN_CALCULATING_MS)
    ])

    totalXpEarned.value = res.quiz.xpEarned
  } catch (err) {
    console.error('Finalize topic quiz failed', err)
  } finally {
    finishing.value = false
  }
}

async function next() {
  stop()
  answered.value = false
  selectedIndex.value = null

  current.value++

  if (current.value >= questions.value.length) {
    if (answerLog.value.length > 0) {
      await finalizeTopicQuiz()
    }
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

onMounted(async () => {
  try {
    const token = await getAccessToken()

    const weakest = await $fetch<{ id: string }[]>(
      '/api/word-progress/weakest',
      {
        query: { topic: topicSlug.value },
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
    resetCompletionAnimations()

    if (!qs.length) return

    const token = await getAccessToken()
    const wordIds = qs.map(q => q.wordId)

    const progressMap = await $fetch<
      Record<string, { xp: number; streak: number }>
    >('/api/word-progress', {
      query: { wordIds: wordIds.join(',') },
      headers: { Authorization: `Bearer ${token}` }
    })

    wordProgressMap.value = progressMap

    const firstId = qs[0]?.wordId
    currentStreak.value = progressMap[firstId]?.streak ?? 0
    currentXp.value = progressMap[firstId]?.xp ?? 0
  },
  { immediate: true }
)

watch(weakestIds, () => {
  current.value = 0
  score.value = 0
  answerLog.value = []
  completionSoundPlayed.value = false
  resetCompletionAnimations()
})

watch(
  () => showResults.value,
  (visible) => {
    if (!visible) return

    if (!completionAnimated.value) {
      completionAnimated.value = true
      runCompletionAnimations()
      animateCount(animatedXpEarned, totalXpEarned.value, 1000)
    }

    if (!completionSoundPlayed.value) {
      completionSoundPlayed.value = true
      stop()

      setTimeout(() => {
        if (percentage.value >= 90) {
          playQuizCompleteFanfareSong()
        } else if (percentage.value >= 50) {
          playQuizCompleteOkaySong()
        } else {
          playQuizCompleteFailSong()
        }
      }, 250)
    }
  }
)

watch(
  () => question.value?.wordId,
  () => {
    generateTileColors()
  },
  { immediate: true }
)
</script>

<template>
  <main class="max-w-xl mx-auto px-4 py-16 space-y-8">
    <NuxtLink
      v-if="current < questions.length"
      :to="`/topics/quiz`"
      class="text-black text-sm hover:underline"
    >
      ← Back to topic quizzes
    </NuxtLink>

    <section class="text-center space-y-4">
      <h1 class="text-2xl font-semibold capitalize">
        {{ topicSlug.replace('-', ' ') }}
      </h1>

      <div class="flex items-center gap-3 mb-6">
        <div
          v-if="(current + 1) <= questions.length"
          class="flex-1 bg-gray-200 rounded-full h-3"
        >
          <div
            class="bg-purple-300 h-3 rounded-full transition-all duration-300"
            :style="{ width: progressPercent + '%' }"
          />
        </div>

        <span
          v-if="(current + 1) <= questions.length"
          class="text-sm text-gray-500 whitespace-nowrap"
        >
          {{ current + 1 }} / {{ questions.length }}
        </span>
      </div>

      <div v-if="showQuiz" class="space-y-6">
        <p class="text-4xl font-semibold min-h-[64px] flex items-center justify-center">
          {{ question.prompt }}
        </p>

        <div class="min-h-[50px] space-y-3">
          <div class="flex items-center justify-center gap-3">
            <div class="w-32 h-1 bg-gray-200 rounded">
              <div
                class="h-1 bg-green-500 rounded transition-all duration-500"
                :style="{ width: Math.min((currentXp ?? 0) / masteryXp * 100, 100) + '%' }"
              />
            </div>

            <div class="relative flex items-center">
              <span class="text-sm text-gray-500 whitespace-nowrap">
                {{ currentXp ?? 0 }} / {{ masteryXp }} XP
              </span>

              <transition name="xp-fall">
                <span
                  v-if="xpDelta !== null"
                  class="absolute left-full ml-2 text-sm font-semibold pointer-events-none"
                  :class="xpDelta > 0 ? 'text-green-600' : 'text-red-600'"
                >
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
          <button
            v-for="(option, i) in question.options"
            :key="i"
            class="answer-tile aspect-square rounded-xl flex items-center justify-center
              text-xl font-semibold text-center p-6 select-none
              transition-all duration-300 ease-out shadow-sm active:scale-95"
            :style="{
              backgroundColor:
                !answered
                  ? tileColors[i]
                  : i === question.correctIndex
                    ? '#BBF7D0'
                    : i === selectedIndex
                      ? '#FECACA'
                      : tileColors[i]
            }"
            :class="[
              !answered && 'hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg hover:brightness-110',
              answered && i === question.correctIndex && 'ring-2 ring-emerald-400',
              answered && i === selectedIndex && i !== question.correctIndex && 'animate-shake ring-2 ring-rose-400'
            ]"
            @click="answer(i)"
          >
            {{ option }}
          </button>
        </div>

        <div class="h-10">
          <button
            v-if="answered"
            class="w-full rounded-xl font-medium text-black py-2 hover:brightness-110"
            style="background-color:#F4C2D7;"
            @click="next"
          >
            Next
          </button>
        </div>
      </div>

      <transition name="fade-scale" mode="out-in">
        <div
          v-if="showCalculating"
          key="calculating"
          class="stat-card hero-card result-2 space-y-4"
        >
          <div class="spinner mx-auto" />

          <p class="stat-label">
            Calculating
          </p>

          <h2 class="hero-title">
            Marking your quiz...
          </h2>

          <p class="hero-subtext">
            Updating your XP and preparing your results
          </p>
        </div>

        <div v-else-if="showResults" key="results" class="space-y-6">
          <transition name="card-fade" appear>
            <div class="stat-card hero-card" :class="resultHeroClass">
              <p class="stat-label">
                Quiz Complete
              </p>

              <h2 class="hero-title">
                {{ resultMeta.title }}
              </h2>

              <p class="hero-score">
                {{ animatedAccuracy }}%
              </p>

              <p class="hero-subtext">
                {{ score }} / {{ questions.length }} correct
              </p>
            </div>
          </transition>

          <transition-group
            name="card-fade"
            tag="div"
            class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6"
          >
            <div
              v-for="tile in completionTiles"
              :key="tile.label"
              class="stat-card hover:brightness-110"
              :class="tile.className"
            >
              <p class="stat-label">
                {{ tile.label }}
              </p>

              <p class="stat-value">
                {{ tile.prefix ?? '' }}{{ tile.value }} {{ tile.suffix }}
              </p>
            </div>
          </transition-group>

          <div v-if="correctWords.length" class="stat-card text-left result-3">
            <h3 class="text-sm font-semibold text-gray-900 mb-3">
              Correct
            </h3>

            <div class="flex flex-wrap gap-2">
              <span
                v-for="word in correctWords"
                :key="word!.id"
                class="rounded-lg text-green-700 px-3 py-1 text-base hover:brightness-125"
              >
                {{ word!.word }}
              </span>
            </div>
          </div>

          <div v-if="missedWords.length" class="stat-card text-left result-1">
            <h3 class="text-sm font-semibold text-gray-900 mb-3">
              Incorrect
            </h3>

            <div class="flex flex-wrap gap-2">
              <span
                v-for="word in missedWords"
                :key="word!.id"
                class="rounded-lg text-rose-700 px-3 py-1 text-base hover:brightness-125"
              >
                {{ word!.word }}
              </span>
            </div>
          </div>

          <div class="pt-2 space-y-3">
            <NuxtLink
              :to="`/topics/quiz`"
              class="block w-full rounded-xl text-black py-3 text-center font-medium hover:brightness-110 transition"
              style="background-color:#A8CAE0;"
            >
              Play Again
            </NuxtLink>

            <NuxtLink
              :to="`/topic/words/${topicSlug}`"
              class="block w-full rounded-xl bg-white text-gray-900 py-3 text-center font-medium hover:brightness-110 transition"
              style="background-color:rgba(244,205,39,0.35);"
            >
              Back to topic
            </NuxtLink>
          </div>
        </div>
      </transition>
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