<script setup lang="ts">

definePageMeta({
  // middleware: ['topic-access'],
  ssr: true,
})

import WordTile from '@/components/WordTile.vue'
import { createError } from 'nuxt/app'
import { computed, onMounted, ref } from 'vue'

const route = useRoute()
const slug = route.params.topic as string

const { authReady, isLoggedIn, entitlement } = useMeStateV2()

const { data: topic, error } = await useFetch(
  `/api/index/topics/${slug}`,
  {
    server: true,
    credentials: 'include',
  }
)

const FREE_TOPICS = ['survival-essentials', 'greetings-polite', 'fruits-vegetables', 'clothing', '']

const isTopicFree = computed(() => {
  return FREE_TOPICS.includes(slug)
})


if (error.value?.statusCode === 403) {
  throw createError({ statusCode: 403, statusMessage: 'Topic locked' })
}

if (!topic.value) {
  throw createError({ statusCode: 404, statusMessage: 'Topic not found' })
}

const categories = computed(() =>
  Object.entries(topic.value.categories).map(([key, words]) => ({
    key,
    title: key.replace(/_/g, ' '),
    words,
  }))
)

/* ============================= */
/* 🔥 ADD THIS SECTION */
/* ============================= */

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

const FREE_WORD_LIMIT = 5

const hasPaidAccess = computed(() => {
  if (!authReady.value) return false
  if (!isLoggedIn.value) return false

  if (!isLoggedIn.value) return false

  return canAccessLevel(entitlement.value!)
})

const gatedCategories = computed(() => {
  let globalIndex = 0

  return categories.value.map(category => {
    return {
      ...category,
      words: category.words.map((word: any) => {

        const shouldLock =
          !isTopicFree.value &&
          !hasPaidAccess.value &&
          globalIndex >= FREE_WORD_LIMIT

        globalIndex++

        return {
          ...word,
          locked: shouldLock
        }
      })
    }
  })
})

</script>

<template>
  <main v-if="authReady" class="max-w-4xl mx-auto px-4 py-12 space-y-12">
    <header class="space-y-2">
      <h1 class="text-3xl font-semibold">{{ topic.title }}</h1>
      <p class="text-gray-600">{{ topic.description }}</p>
    </header>

    <section v-for="category in gatedCategories" :key="category.key" class="space-y-4">
      
      <h2 class="text-xl font-medium capitalize">
        {{ category.title }}
      </h2>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">

        <WordTile v-for="word in category.words" :key="word.id"
          :to="word.locked ? undefined : `/topic/word/${slug}/${word.id}`" :word="word.word" :jyutping="word.jyutping"
          :meaning="word.meaning" :xp="getXp(word.id)" :mastered="isMastered(word.id)"
          :class="word.locked ? 'opacity-40 pointer-events-none select-none' : ''" />
      </div>
    </section>
  </main>
</template>
