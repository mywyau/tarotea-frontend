<script setup lang="ts">

// definePageMeta({
//   middleware: ['coming-soon'],
//   ssr: true,
// })

import SentenceMeaningExercise from '@/components/SentenceMeaningExercise.vue'
import { getLevelNumber } from '@/utils/levels'

interface SentenceLevelPayload {
  level: number
  set: number
  title: string
  mode: string
  sentences: Sentence[]
}

interface Sentence {
  id: string
  cantonese: string
  jyutping: string
  meaning: string
  audio: string
  focus_words: string[]
  difficulty: number
}

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const levelNumber = computed(() => getLevelNumber(slug.value))

if (!levelNumber.value) {
  throw createError({ statusCode: 404, statusMessage: 'Level not found' })
}

const { data, error } = await useFetch(
  () => `/api/sentences/${slug.value}`,
  {
    key: () => `sentences-${slug.value}`,
    server: true
  }
)

const QUESTIONS_PER_SESSION = 20

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

const sentencesCDN = computed(() => data.value)
const notFound = computed(() => error.value?.statusCode === 404)


const current = ref(0)
const answered = ref(false)
const selectedIndex = ref<number | null>(null)
const question = computed(() => questions.value[current.value])

const quizKey = ref(0)

function resetQuiz() {
  // we reset the quiz by changing the component key
  quizKey.value++
}

const sessionSentences = computed(() => {
  const all = data.value?.sentences ?? []

  const mapped = all.map(s => ({
    id: s.id,
    text: s.cantonese,
    meaning: s.meaning
  }))

  return shuffle(mapped).slice(0, QUESTIONS_PER_SESSION)
})

const allSentences = computed(() =>
  (data.value?.sentences ?? []).map(s => ({
    id: s.id,
    text: s.cantonese,
    meaning: s.meaning
  }))
)

</script>

<template>
  <main class="max-w-3xl mx-auto px-4 py-12 space-y-10">

    <!-- Back -->
    <!-- <NuxtLink
      :to="`/quiz/${slug}`"
      class="text-sm text-gray-500 hover:underline"
    >
      ← Back to sentence exercises
    </NuxtLink> -->

    <NuxtLink :to="`/coming-soon`" class="text-sm text-gray-500 hover:underline">
      ← Back to all exercises
    </NuxtLink>

    <!-- Exercise -->
    <SentenceMeaningExercise :key="quizKey" :sentences="sessionSentences" :all-sentences="allSentences" />

    <!-- same container size as the exercises -->
    <div class="max-w-xl mx-auto pt-6 text-center">
      <button class="text-base text-gray-400 hover:text-gray-600 hover:underline transition" @click="resetQuiz">
        Reset quiz
      </button>
    </div>


  </main>
</template>
