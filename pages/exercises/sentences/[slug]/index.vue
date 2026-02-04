<script setup lang="ts">

definePageMeta({
  middleware: ['coming-soon'],
  ssr: true,
})

import SentenceMeaningExercise from '@/components/SentenceMeaningExercise.vue'
import { getLevelNumber } from '@/utils/levels'

interface Sentence {
  id: string
  text: string
  meaning: string
  level: number
}

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const levelNumber = computed(() => getLevelNumber(slug.value))

if (!levelNumber.value) {
  throw createError({ statusCode: 404, statusMessage: 'Level not found' })
}

const current = ref(0)
const answered = ref(false)
const selectedIndex = ref<number | null>(null)
const question = computed(() => questions.value[current.value])

/**
 * 🔧 MOCK DATA — Level 1 sample
 * Replace with CDN fetch later
 */

const mockSentences: Sentence[] = [
  {
    id: 'l1-s1',
    text: '我去食飯。',
    meaning: 'I’m going to eat.',
    level: 1
  },
  {
    id: 'l1-s2',
    text: '佢係我朋友。',
    meaning: 'He is my friend.',
    level: 1
  },
  {
    id: 'l1-s3',
    text: '我哋飲水。',
    meaning: 'We are drinking water.',
    level: 1
  },
  {
    id: 'l1-s4',
    text: '你坐喺度。',
    meaning: 'You are sitting here.',
    level: 1
  },
  {
    id: 'l1-s5',
    text: '爸爸返屋企。',
    meaning: 'Dad is going home.',
    level: 1
  }
]

const sentences = computed(() => mockSentences)

/**
 * For now: reuse same pool for distractors
 * Later: pass in global sentence pool
 */
const allSentences = computed(() => mockSentences)

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
      ← Back to sentence exercises
    </NuxtLink>

    <!-- Header -->
    <header class="text-center space-y-3">
      <h1 class="text-3xl font-semibold">
        Sentence Practice
      </h1>
    </header>

    <!-- Exercise -->
    <SentenceMeaningExercise :sentences="sentences" :all-sentences="allSentences" />

  </main>
</template>
