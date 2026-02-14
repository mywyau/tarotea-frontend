<script setup lang="ts">

definePageMeta({
  middleware: ['level-access']
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

const question = computed(() => questions.value[current.value])

const levelNumber = getLevelNumber(slug.value)

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

const xpDelta = ref<number | null>(null)

async function answer(index: number) {
  if (answered.value) return
  if (!question.value) return

  selectedIndex.value = index
  answered.value = true

  const correct = index === question.value.correctIndex

  // Update UI immediately
  if (correct) {
    score.value++
    playCorrectJingle()
  } else {
    playIncorrectJingle()
  }

  console.log(question.value)

  try {
    const token = await getAccessToken()

    const res = await $fetch<{
      success: boolean
      delta: number
      newXp: number
      newStreak: number
    }>('/api/word-progress/update', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        wordId: question.value.wordId,
        correct
      }
    })


    xpDelta.value = res.delta
    currentXp.value = res.newXp
    currentStreak.value = res.newStreak

    setTimeout(() => {
      xpDelta.value = null
    }, 1000)

  } catch (err) {
    console.error('XP update failed', err)
  }
}

function next() {
  stop() // 🔑 stop current word audio
  answered.value = false
  selectedIndex.value = null
  current.value++
}


const percentage = computed(() => {
  if (questions.value.length === 0) return 0
  return (score.value / questions.value.length) * 100
})

const completionSoundPlayed = ref(false)

watch(
  () => question.value?.wordId,
  async (wordId) => {
    if (!wordId) return

    try {
      const token = await getAccessToken()

      const progressMap = await $fetch<
        Record<string, { xp: number; streak: number }>
      >(
        '/api/word-progress',
        {
          query: { wordIds: wordId },
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      currentXp.value = progressMap[wordId]?.xp ?? 0
      currentStreak.value = progressMap[wordId]?.streak ?? 0
    } catch {
      currentXp.value = 0
      currentStreak.value = 0
    }
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
        if (percentage.value >= 90) {
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


</script>

<template>

  <main class="max-w-xl mx-auto px-4 py-16 space-y-8">

    <NuxtLink v-if="current < questions.length" :to="`/quiz/${slug}/audio/start-quiz`"
      class="text-gray-500 hover:underline">
      ← Restart Quiz
    </NuxtLink>

    <section class="text-center space-y-4">

      <h1 class="text-2xl font-semibold text-center">
        {{ LEVEL_TITLES[slug] ?? 'Unknown level' }}
      </h1>

      <p v-if="(current + 1) <= questions.length" class="text-sm text-gray-500 text-center">
        Question {{ current + 1 }} / {{ questions.length }}
      </p>

      <div v-if="current < questions.length" class="space-y-6">

        <div v-if="question.type === 'audio'" class="text-center">
          <AudioButton :key="question.audioKey" :src="`${cdnBase}/audio/${question.audioKey}`" autoplay />
        </div>

        <div class="text-center space-y-3">

          <div v-if="currentXp !== null" class="text-sm text-gray-500">
            {{ currentXp }} XP
          </div>

          <div class="w-32 mx-auto h-1 bg-gray-200 rounded">
            <div class="h-1 bg-green-500 rounded transition-all duration-500"
              :style="{ width: Math.min((currentXp ?? 0) / 1000 * 100, 100) + '%' }" />
          </div>

          <transition name="fade-streak" mode="out-in">
            <div v-if="currentStreak && currentStreak > 0" :key="question.wordId" class="text-xs text-orange-500">
              🔥 {{ currentStreak }} streak
            </div>
          </transition>

        </div>

        <div class="h-8 relative flex items-center justify-center">
          <transition name="xp-fall">
            <div v-if="xpDelta !== null" class="absolute text-xl font-semibold pointer-events-none"
              :class="xpDelta > 0 ? 'text-green-600' : 'text-red-600'">
              {{ xpDelta > 0 ? '+' + xpDelta : xpDelta }} XP
            </div>
          </transition>
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

        <button v-if="answered" class="w-full mt-4 rounded bg-black text-white py-2" @click="next">
          Next
        </button>

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

          <NuxtLink :to="`/level/${slug}`" class="block text-gray-500 hover:underline">
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
