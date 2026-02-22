<script setup lang="ts">

definePageMeta({
  middleware: ['level-access'],
  ssr: false
})


import { computed, ref, watch } from 'vue'

import {
  playQuizCompleteFailSong,
  playQuizCompleteFanfareSong,
  playQuizCompleteOkaySong
} from '@/utils/sounds'


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

import { generateQuiz } from '~/utils/quiz/generateQuiz'

const route = useRoute()
const slug = computed(() => route.params.slug as string)

type QuizAnswer = { wordId: string; correct: boolean }
const answerLog = ref<QuizAnswer[]>([])
const finishing = ref(false)

const wordsForLevel = computed<Word[]>(() => {
  if (!data.value) return []

  return Object.values(data.value.categories).flat()
})


function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

const { getAccessToken } = await useAuth()

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
      body: { answers: answerLog.value }
    })

  } catch (err) {
    console.error('Finalize failed', err)
  } finally {
    finishing.value = false
  }
}

const weightedWords = computed(() => {
  const words = wordsForLevel.value

  if (!words.length) {
    return []
  }

  const totalQuestions = 20

  if (!weakestIds.value.length) {
    return shuffle(words).slice(0, totalQuestions)
  }

  const weakestPool = shuffle(
    words.filter(w => weakestIds.value.includes(w.id))
  )

  const nonWeakestPool = shuffle(
    words.filter(w => !weakestIds.value.includes(w.id))
  )


  const weakestTarget = Math.floor(totalQuestions * 0.7)

  const selected: Word[] = []

  selected.push(...weakestPool.slice(0, weakestTarget))
  selected.push(
    ...nonWeakestPool.slice(0, totalQuestions - selected.length)
  )


  if (selected.length < totalQuestions) {
    const remaining = shuffle(
      words.filter(w => !selected.some(s => s.id === w.id))
    )

    selected.push(
      ...remaining.slice(0, totalQuestions - selected.length)
    )
  }


  return shuffle(selected)
})

const questions = computed(() =>
  weightedWords.value.length
    ? generateQuiz(weightedWords.value)
    : []
)


const { data, error } = await useFetch<LevelData>(
  () => `/api/vocab-quiz/${slug.value}`,
  {
    key: () => `vocab-quiz-${slug.value}`,
    server: true
  }
)

const weakestIds = ref<string[]>([])

const current = ref(0)
const score = ref(0)
const answered = ref(false)
const selectedIndex = ref<number | null>(null)
const xpDelta = ref<number | null>(null)
const currentXp = ref<number | null>(null)
const currentStreak = ref<number | null>(null)
const showResult = ref(false)
const wordProgressMap = ref<Record<string, { xp: number; streak: number }>>({})


const question = computed(() => questions.value[current.value])

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

const STREAK_CAP = 5
const WRONG_PENALTY = -12

function deltaFor(correct: boolean, streakBefore: number) {
  if (!correct) return WRONG_PENALTY
  return 5 + Math.min(streakBefore, STREAK_CAP) * 2
}

const progressPercent = computed(() => {
  const total = questions.value.length
  if (!total) return 0

  // +1 because UI shows 1-based progress
  // const answered = Math.min(current.value, total)
  const position = Math.min(current.value + 1, total)
  return Math.round((position / total) * 100)
})

async function answer(index: number) {
  if (answered.value) return
  if (!question.value) return

  selectedIndex.value = index
  answered.value = true

  const correct = index === question.value.correctIndex

  // store answer
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

  const wordId = question.value.wordId  //

  const prev = wordProgressMap.value[wordId] ?? { xp: 0, streak: 0 }

  const delta = deltaFor(correct, prev.streak)

  const newStreak = correct ? prev.streak + 1 : 0
  const newXp = Math.max(0, prev.xp + delta) // ✅ clamp here


  wordProgressMap.value[wordId] = {
    xp: newXp,
    streak: newStreak
  }

  xpDelta.value = delta
  currentXp.value = newXp
  currentStreak.value = newStreak

  currentXp.value = newXp
  currentStreak.value = newStreak

  setTimeout(() => {
    xpDelta.value = null
  }, 1000)
}

async function next() {
  answered.value = false
  selectedIndex.value = null

  current.value++

  if (current.value >= questions.value.length) {
    if (answerLog.value.length > 0) {
      await finalizeQuiz()
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

// optional if you have these already:
// const { stop } = useGlobalAudio()

const percentage = computed(() => {
  const total = questions.value.length
  if (!total) return 0
  return (score.value / total) * 100
})

const isComplete = computed(() => current.value >= questions.value.length)

const completionSoundPlayed = ref(false)

watch(
  isComplete,
  (done) => {
    if (!done || completionSoundPlayed.value) return
    completionSoundPlayed.value = true

    // if you have global audio (TTS etc), stop it so jingles are audible
    // stop?.()

    // small delay so the completion UI has rendered
    setTimeout(() => {
      const p = percentage.value

      if (p >= 70) playQuizCompleteFanfareSong()
      else if (p >= 50) playQuizCompleteOkaySong()
      else playQuizCompleteFailSong()
    }, 250)
  },
  { immediate: true }
)

</script>

<template>
  <main class="max-w-xl mx-auto px-4 py-16 space-y-8">

    <NuxtLink v-if="current < questions.length" :to="`/quiz/${slug}/word/start-quiz`"
      class="text-black hover:underline">
      ← Restart Quiz
    </NuxtLink>

    <h1 class="text-2xl font-semibold text-center">
      {{ LEVEL_TITLES[slug] ?? 'Unknown level' }}
    </h1>

    <div class="flex items-center gap-3 mb-6">

      <div class="flex-1 bg-gray-200 rounded-full h-3">
        <div class="bg-blue-300 h-3 rounded-full transition-all duration-300"
          :style="{ width: progressPercent + '%' }" />
      </div>

      <span v-if="(current + 1) <= questions.length" class="text-sm text-gray-500 whitespace-nowrap">
        {{ current + 1 }} / {{ questions.length }}
      </span>

    </div>


    <div v-if="current < questions.length" class="space-y-6">

      <div class="text-center">

        <p class="text-4xl mb-3 min-h-[64px] flex items-center justify-center text-center">
          {{ question.prompt }}
        </p>

        <div class="min-h-[50px] space-y-3">

          <!-- XP -->
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
            <span class="text-xs text-orange-500">
              {{ currentStreak && currentStreak > 0 ? `${currentStreak} streak` : '' }}
            </span>
          </div>

        </div>
      </div>


      <div class="grid grid-cols-2 gap-4">
        <button v-for="(option, i) in question.options" :key="i" class="aspect-square rounded-lg border flex items-center justify-center
           text-2xl font-medium text-center p-6 transition" :class="[
            !answered && 'hover:bg-gray-100',
            {
              'bg-green-100':
                answered && i === question.correctIndex,
              'bg-red-100 animate-shake':
                answered && i === selectedIndex && i !== question.correctIndex
            }
          ]" @click="answer(i)">
          {{ option }}
        </button>
      </div>

      <div class="h-12">
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
        <NuxtLink :to="`/quiz/${slug}/word/start-quiz`"
          class="block w-full rounded bg-black text-white py-2 text-center font-medium hover:bg-gray-800 transition">
          Restart Quiz
        </NuxtLink>

        <NuxtLink :to="`/level/${slug}`" class="block text-black hover:underline">
          ← {{ LEVEL_TITLES[slug] }} Vocab
        </NuxtLink>
      </div>
    </div>

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
</style>
