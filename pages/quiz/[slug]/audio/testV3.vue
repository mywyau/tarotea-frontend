<script setup lang="ts">

definePageMeta({
  middleware: ['level-access'],
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


import { computed, ref } from 'vue'

import { generateAudioQuiz } from '@/utils/quiz/generateAudioQuiz'

import {
  playQuizCompleteFailSong,
  playQuizCompleteFanfareSong,
  playQuizCompleteOkaySong
} from '@/utils/sounds'

const route = useRoute()
const slug = computed(() => route.params.slug as string)

type QuizAnswer = { wordId: string; correct: boolean }

const answerLog = ref<QuizAnswer[]>([])
const finishing = ref(false)

const { getAccessToken } = await useAuth()

const { stop } = useGlobalAudio()

const { data, error } = await useFetch<LevelData>(
  () => `/api/vocab-quiz/${slug.value}`,
  {
    key: () => `audio-quiz-${slug.value}`,
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
const showResult = ref<boolean>(false)

const question = computed(() => questions.value[current.value])

const levelNumber = getLevelNumber(slug.value)

const BRAND_COLORS = [
  '#EAB8E4',                // lavender blush
  '#A8CAE0',                // soft blue
  '#F4C2D7',                // pink
  '#F2CACA',                // blush
  '#D6A3D1',                // deeper purple
  'rgba(244,205,39,0.35)',  // yellow
]

const tileColors = ref<string[]>([])

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function generateTileColors() {
  tileColors.value = shuffle(BRAND_COLORS).slice(0, 4)
}

const LEVEL_TITLES: Record<string, string> = {
  'level-one': 'Level 1',
  'level-two': 'Level 2',
  'level-three': 'Level 3',
  'level-four': 'Level 4',
  'level-five': 'Level 5',
  'level-six': 'Level 6',
  'level-seven': 'Level 7',
  'level-eight': 'Level 8',
  'level-nine': 'Level 9',
  'level-ten': 'Level 10',
  'level-eleven': 'Level 11',
  'level-twelve': 'Level 12',
  'level-thirteen': 'Level 13',
  'level-fourteen': 'Level 14',
  'level-fiftheen': 'Level 15',
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

    await $fetch<{
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
      class="text-black hover:underline">
      ← Restart Quiz
    </NuxtLink>

    <section class="text-center space-y-4">

      <h1 class="text-2xl font-semibold text-center">
        {{ LEVEL_TITLES[slug] ?? 'Unknown level' }}
      </h1>

      <div class="flex items-center gap-3 mb-6">

        <div class="flex-1 bg-gray-200 rounded-full h-3">
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
                :style="{ width: Math.min((currentXp ?? 0) / 1000 * 100, 100) + '%' }" />
            </div>

            <!-- XP Text + Delta Anchor -->
            <div class="relative flex items-center">

              <span class="text-sm text-gray-500 whitespace-nowrap">
                {{ currentXp ?? 0 }} XP
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
          <button v-if="answered" class="w-full rounded bg-black text-white py-2" @click="next">
            Next
          </button>
        </div>

      </div>

      <div v-else class="text-center space-y-6">

        <h2 class="text-2xl font-semibold">
          Quiz complete
        </h2>

        <p class="text-gray-600">
          {{ score }} / {{ questions.length }}
        </p>

        <p class="text-gray-600">
          You scored {{ score === questions.length
            ? '100%'
            : ((score / questions.length) * 100).toFixed(2) + '%' }}
        </p>

        <div class="pt-4 space-y-4">
          <NuxtLink :to="`/quiz/${slug}/audio/start-quiz`"
            class="block w-full rounded bg-black text-white py-2 text-center font-medium hover:bg-gray-800 transition">
            Restart Quiz
          </NuxtLink>

          <NuxtLink :to="`/level/${slug}`" class="block text-black hover:underline">
            ← {{ levelNumber }} Vocab
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
</style>
