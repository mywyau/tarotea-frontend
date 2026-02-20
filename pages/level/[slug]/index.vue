<script setup lang="ts">

definePageMeta({
  middleware: ['level-access'],
  ssr: true,
})

import WordTile from '@/components/WordTile.vue'
import { getLevelNumber } from '@/utils/levels'
import { createError } from 'nuxt/app'
import { useRoute } from 'vue-router'

const route = useRoute()
const slug = route.params.slug as string


const levelNumber = getLevelNumber(slug)
if (levelNumber === null) {
  throw createError({ statusCode: 404, statusMessage: 'Level not found' })
}

// SSR-safe fetch (no gating, no nulls)
const { data: topic, error } = await useFetch(
  `/api/index/levels/${slug}`,
  {
    server: true,
    credentials: 'include', // 👈 cookies
  }
)

// Handle backend responses
if (error.value?.statusCode === 403) {
  throw createError({ statusCode: 403, statusMessage: 'Level locked' })
}

if (!topic.value) {
  throw createError({ statusCode: 404, statusMessage: 'Level not found' })
}

const categories = computed(() =>
  Object.entries(topic.value.categories).map(([key, words]) => ({
    key,
    title: key.replace(/_/g, ' '),
    words,
  }))
)

const progressMap = ref<Record<string, { xp: number; streak: number }>>({})

async function loadProgress() {
  try {
    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()

    const wordIds = Object.values(topic.value.categories)
      .flat()
      .map((w: any) => w.id)

    if (!wordIds.length) return

    const result = await $fetch<
      Record<string, { xp: number; streak: number }>
    >('/api/word-progress', {
      query: { wordIds: wordIds.join(',') },
      headers: { Authorization: `Bearer ${token}` }
    })

    progressMap.value = result
  } catch {
    progressMap.value = {}
  }
}

onMounted(loadProgress)

const getXp = (id: string) =>
  progressMap.value?.[id]?.xp ?? 0

const getStreak = (id: string) =>
  progressMap.value?.[id]?.streak ?? 0


const MASTERY_XP = 200

const isMastered = (id: string) =>
  (progressMap.value?.[id]?.xp ?? 0) >= MASTERY_XP

</script>

<template>
  <main class="max-w-4xl mx-auto px-4 py-12 space-y-12">
    <header class="space-y-2">
      <h1 class="text-3xl font-semibold">{{ topic.title }}</h1>
      <p class="text-gray-600">{{ topic.description }}</p>
    </header>

    <section v-for="category in categories" :key="category.key" class="space-y-4">
      <h2 class="text-xl font-medium capitalize">
        {{ category.title }}
      </h2>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">

        <WordTile v-for="word in category.words" :key="word.id" :to="`/level/${slug}/word/${word.id}`" :word="word.word"
          :jyutping="word.jyutping" :meaning="word.meaning" :xp="getXp(word.id)" :mastered="isMastered(word.id)" />

      </div>
    </section>
  </main>
</template>
