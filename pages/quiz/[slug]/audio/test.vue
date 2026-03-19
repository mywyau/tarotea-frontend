<script setup lang="ts">

definePageMeta({
  middleware: ['level-quiz-access'],
  ssr: false
})

type Word = {
  id: string
  word: string
  jyutping: string
  meaning: string
}

type LevelData = {
  level: number
  title: string
  description: string
  categories: Record<string, Word[]>
}

type QuizAnswer = { wordId: string; correct: boolean }

import { generateAudioQuiz } from '@/utils/quiz/generateAudioQuiz'
import { computed, ref } from 'vue'

import {
  playQuizCompleteFailSong,
  playQuizCompleteFanfareSong,
  playQuizCompleteOkaySong
} from '@/utils/sounds'
import { brandColours } from '~/utils/branding/helpers'
import { isLevelId, levelIdToNumbers, levelTitles } from '~/utils/levels/levels'
import { masteryXp } from '~/utils/xp/helpers'

const route = useRoute()
// const slug = computed(() => route.params.slug as string)
const slug = route.params.slug as string

if (!isLevelId(slug)) {
  throw createError({ statusCode: 404 })
}

const levelNumber: number = levelIdToNumbers(slug)

const answerLog = ref<QuizAnswer[]>([])
const finishing = ref(false)

const { getAccessToken } = await useAuth()

const { stop } = useGlobalAudio()

const { data, error } = await useFetch<LevelData>(
  () => `/api/vocab-quiz/${slug}`,
  {
    key: () => `audio-quiz-${slug}`,
    server: true
  }
)

const wordsForLevel = computed<Word[]>(() => {
  if (!data.value) return []
  return Object.values(data.value.categories).flat()
})

const questions = computed(() =>
  wordsForLevel.value.length
    ? generateAudioQuiz(wordsForLevel.value)
    : []
)

const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

const current = ref(0)
const score = ref(0)
const answered = ref(false)
const selectedIndex = ref<number | null>(null)

const currentXp = ref<number | null>(null)
const currentStreak = ref<number | null>(null)

const question = computed(() => questions.value[current.value])

const tileColors = ref<string[]>([])

const totalXpEarned = ref<number>(0)

const accuracy = computed(() => {
  if (!questions.value.length) return 0
  return Math.round((score.value / questions.value.length) * 100)
})

const incorrectCount = computed(() => {
  return Math.max(0, questions.value.length - score.value)
})

const resultMeta = computed(() => {

  if (accuracy.value === 100) {
    return {
      title: 'Perfect',
      ring: 'ring-green-300',
      bg: 'bg-green-50'
    }
  }

  if (accuracy.value >= 70) {
    return {
      title: 'Great job',
      ring: 'ring-green-300',
      bg: 'bg-green-50'
    }
  }

  if (accuracy.value >= 50) {
    return {
      title: 'Nice try',
      ring: 'ring-blue-300',
      bg: 'bg-blue-50'
    }
  }

  return {
    title: 'Keep practicing',
    ring: 'ring-rose-300',
    bg: 'bg-rose-50'
  }
})

const missedWords = computed(() => {
  return answerLog.value
    .filter(a => !a.correct)
    .map(a => wordsForLevel.value.find(w => w.id === a.wordId))
    .filter(Boolean)
})

const correctWords = computed(() => {
  return answerLog.value
    .filter(a => a.correct)
    .map(a => wordsForLevel.value.find(w => w.id === a.wordId))
    .filter(Boolean)
})


function generateTileColors() {
  tileColors.value = shuffleFisherYates(brandColours).slice(0, 4)
}

const WRONG_PENALTY = -12
const STREAK_CAP = 5
function deltaFor(correct: boolean, streakBefore: number) {
  if (!correct) return WRONG_PENALTY
  return 5 + Math.min(streakBefore, STREAK_CAP) * 2
}

const xpDelta = ref<number | null>(null)

async function answer(index: number) {
  if (answered.value) return
  if (!question.value) return

  selectedIndex.value = index
  answered.value = true

  const correct = index === question.value.correctIndex

  if (correct) {
    score.value++
    playCorrectJingle()
  } else {
    playIncorrectJingle()
  }

  // store locally for finalize
  const wordId = question.value.wordId
  answerLog.value.push({ wordId, correct })

  // optimistic xp/streak update (same as word quiz)
  const prev = wordProgressMap.value[wordId] ?? { xp: 0, streak: 0 }
  const delta = deltaFor(correct, prev.streak)
  const newStreak = correct ? prev.streak + 1 : 0
  const newXp = Math.max(0, prev.xp + delta)

  wordProgressMap.value[wordId] = { xp: newXp, streak: newStreak }

  xpDelta.value = delta
  currentXp.value = newXp
  currentStreak.value = newStreak

  setTimeout(() => {
    xpDelta.value = null
  }, 1000)
}

const wordProgressMap = ref<Record<string, { xp: number; streak: number }>>({})

async function finalizeQuiz() {
  if (finishing.value) return
  finishing.value = true

  try {
    const token = await getAccessToken()

    const res = await $fetch<{
      quiz: {
        correctCount: number
        totalQuestions: number
        xpEarned: number
      }
    }>('/api/quiz/grind/finalize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        answers: answerLog.value
      }
    })

    totalXpEarned.value = res.quiz.xpEarned

  } catch (err) {
    console.error('Audio finalize failed', err)
  } finally {
    finishing.value = false
  }
}

async function next() {
  stop()

  answered.value = false
  selectedIndex.value = null

  // move to next question
  current.value++

  // if finished, finalize once
  if (current.value >= questions.value.length) {
    if (answerLog.value.length > 0) {
      await finalizeQuiz()
    }
    return
  }

  // load xp/streak for the NEW current question
  const nextWordId = questions.value[current.value]?.wordId
  if (nextWordId) {
    currentXp.value = wordProgressMap.value[nextWordId]?.xp ?? 0
    currentStreak.value = wordProgressMap.value[nextWordId]?.streak ?? 0
  }
}

const percentage = computed(() => {
  if (questions.value.length === 0) return 0
  return (score.value / questions.value.length) * 100
})

const completionSoundPlayed = ref(false)

const progressPercent = computed(() => {
  const total = questions.value.length
  if (!total) return 0
  const position = Math.min(current.value + 1, total)
  return Math.round((position / total) * 100)
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
    value: totalXpEarned.value,
    suffix: 'XP',
    className: 'result-2',
    prefix: totalXpEarned.value > 0 ? '+' : ''
  }
])

watch(
  () => questions.value,
  async (qs) => {
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

watch(
  () => current.value,
  (newCurrent) => {
    if (
      newCurrent >= questions.value.length &&
      !completionSoundPlayed.value
    ) {
      completionSoundPlayed.value = true

      stop() // 🔑 stop last word audio

      setTimeout(() => {
        if (percentage.value >= 70) {
          playQuizCompleteFanfareSong()
        } else if (percentage.value >= 50) {
          playQuizCompleteOkaySong()
        } else {
          playQuizCompleteFailSong()
        }
      }, 400)
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

    <NuxtLink v-if="current < questions.length" :to="`/quiz/${slug}/audio/start-quiz`"
      class="text-sm text-black hover:underline">
      ← Restart Quiz
    </NuxtLink>

    <section class="text-center space-y-4">

      <h1 class="text-2xl font-semibold text-center">
        {{ levelTitles[slug] ?? 'Unknown level' }}
      </h1>

      <div class="flex items-center gap-3 mb-6">

        <div v-if="(current + 1) <= questions.length" class="flex-1 bg-gray-200 rounded-full h-3">
          <div class="bg-purple-300 h-3 rounded-full transition-all duration-300"
            :style="{ width: progressPercent + '%' }" />
        </div>

        <span v-if="(current + 1) <= questions.length" class="text-sm text-gray-500 whitespace-nowrap">
          {{ current + 1 }} / {{ questions.length }}
        </span>

      </div>

      <div v-if="current < questions.length" class="space-y-6">

        <div v-if="question.type === 'audio'" class="text-center">
          <AudioButton :key="question.audioKey" :src="`${cdnBase}/audio/${question.audioKey}`" autoplay />
        </div>

        <div class="min-h-[50px] space-y-3">

          <!-- XP Row -->
          <div class="flex items-center justify-center gap-3">

            <!-- XP Bar -->
            <div class="w-32 h-1 bg-gray-200 rounded">
              <div class="h-1 bg-green-500 rounded transition-all duration-500"
                :style="{ width: Math.min((currentXp ?? 0) / masteryXp * 100, 100) + '%' }" />
            </div>

            <!-- XP Text + Delta Anchor -->
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

          <!-- Streak -->
          <div class="h-5 flex items-center justify-center">
            <span v-if="currentStreak && currentStreak > 0" class="text-xs text-orange-500">
              {{ currentStreak }} streak
            </span>
          </div>

        </div>

        <div class="grid grid-cols-2 gap-4">
          <button v-for="(option, i) in question.options" :key="i" class="aspect-square rounded-xl flex items-center justify-center
           text-2xl font-semibold text-center p-6
           transition-all duration-300 ease-out
           shadow-sm active:scale-95 hover:bri" :style="{
            backgroundColor:
              !answered
                ? tileColors[i]
                : i === question.correctIndex
                  ? '#BBF7D0'   // soft green success
                  : i === selectedIndex
                    ? '#FECACA' // soft red fail
                    : tileColors[i]
          }" :class="[
            answered && i === question.correctIndex && 'ring-2 ring-emerald-400',
            answered && i === selectedIndex && i !== question.correctIndex && 'animate-shake ring-2 ring-rose-400'
          ]" @click="answer(i)">
            {{ option }}
          </button>
        </div>

        <div class="h-10">
          <button v-if="answered" class="w-full rounded-xl font-medium text-black py-2 hover:brightness-110"
            @click="next" style="background-color:#F4C2D7;">
            Next
          </button>
        </div>

      </div>

      <div v-else class="space-y-6">

        <div class="rounded-3xl p-6 shadow-sm ring-2" :class="[resultMeta.bg, resultMeta.ring]">

          <h2 class="text-3xl font-bold text-gray-900">
            {{ resultMeta.title }}
          </h2>

          <div class="mt-6">
            <p class="text-5xl font-bold text-gray-900">
              {{ accuracy }}%
            </p>
          </div>
        </div>

        <transition-group name="card-fade" tag="div" class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div v-for="tile in completionTiles" :key="tile.label" class="stat-card hover:brightness-110"
            :class="tile.className">
            <p class="stat-label">
              {{ tile.label }}
            </p>

            <p class="stat-value">
              <template v-if="tile.label === 'XP Earned' && finishing">
                ...
              </template>
              <template v-else>
                {{ tile.prefix ?? '' }}{{ tile.value }} {{ tile.suffix }}
              </template>
            </p>
          </div>
        </transition-group>

        <div v-if="finishing" class="text-sm text-gray-500">
          Saving results...
        </div>

        <div v-if="correctWords.length" class="stat-card text-left result-3">
          <h3 class="text-sm font-semibold text-gray-900 mb-3">
            Correct
          </h3>

          <div class="flex flex-wrap gap-2">
            <span v-for="word in correctWords" :key="word!.id"
              class="rounded-lg text-green-700 px-3 py-1 text-base">
              {{ word!.word }}
            </span>
          </div>
        </div>

        <div v-if="missedWords.length" class="stat-card text-left result-1">
          <h3 class="text-sm font-semibold text-gray-900 mb-3">
            Incorrect
          </h3>

          <div class="flex flex-wrap gap-2">
            <span v-for="word in missedWords" :key="word!.id"
              class="rounded-lg bg-white/70 text-rose-700 px-3 py-1 text-base">
              {{ word!.word }}
            </span>
          </div>
        </div>

        <div class="pt-2 space-y-3">
          <NuxtLink :to="`/quiz/${slug}/audio/start-quiz`"
            class="block w-full rounded-xl text-black py-3 text-center font-medium hover:brightness-110 transition"
            style="background-color:#A8CAE0;">
            Play Again
          </NuxtLink>

          <NuxtLink :to="`/level/${slug}`"
            class="block w-full rounded-xl bg-white text-gray-900 py-3 text-center font-medium hover:brightness-110 transition"
            style="background-color:rgba(244,205,39,0.35);">
            Back to Level {{ levelNumber }}
          </NuxtLink>
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
  transition: transform 0.4s ease, opacity 0.4s ease
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

.fade-streak-enter-active,
.fade-streak-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-streak-enter-from,
.fade-streak-leave-to {
  opacity: 0;
  transform: translateY(-4px);
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
  font-size: 1.9rem;
  font-weight: 700;
  margin-top: 0.75rem;
  color: #111827;
}

/* completion page colours */
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

</style>
