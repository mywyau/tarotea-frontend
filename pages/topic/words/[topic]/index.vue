<script setup lang="ts">

definePageMeta({
  // middleware: ['topic-access'],
  ssr: true,
})

import WordTile from '@/components/WordTile.vue'
import { createError } from 'nuxt/app'
import { computed, onMounted, ref } from 'vue'
import { canAccessTopic } from '~/utils/topics/permissions'
import { topics } from '~/utils/topics/topics'
import { masteryXp } from '~/utils/xp /helpers'

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

const TILE_COLORS = [
  'rgba(234, 184, 228, 0.75)', // pink
  'rgba(214, 163, 209, 0.75)', // purple
  'rgba(168, 202, 224, 0.75)', // blue
  'rgba(246, 225, 225, 0.75)', // blush
  'rgba(244, 194, 215, 0.75)', // rose
  'rgba(244, 205, 39, 0.35)'  // yellow 
]

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

const isMastered = (id: string) =>
  (progressMap.value?.[id]?.xp ?? 0) >= masteryXp

const FREE_WORD_LIMIT = 10

const hasPaidAccess = computed(() => {
  return canAccessTopic(isLoggedIn.value, entitlement.value, topic.id)
})

function getColorFromId(id: string) {
  let hash = 0

  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }

  const index = Math.abs(hash) % TILE_COLORS.length
  return TILE_COLORS[index]
}

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
          locked: shouldLock,
          tileColor: getColorFromId(word.id)
        }
      })
    }
  })
})

</script>

<template>
  <main v-if="authReady" class="max-w-4xl mx-auto px-4 py-12 space-y-6">

    <NuxtLink :to="`/topics`" class="inline-block text-sm text-black hover:underline">
      ← Topics
    </NuxtLink>

    <header class="space-y-2">
      <h1 class="text-3xl font-semibold">{{ topic.title }}</h1>
      <p class="text-gray-600">{{ topic.description }}</p>
    </header>

    <section v-for="category in gatedCategories" :key="category.key" class="space-y-4">

      <h2 class="text-xl font-medium capitalize">
        {{ category.title }}
      </h2>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">

        <WordTile v-for="word in category.words" :key="word.id" v-bind="{
          word: word.word,
          jyutping: word.jyutping,
          meaning: word.meaning,
          xp: getXp(word.id),
          mastered: isMastered(word.id),
          ...(word.locked ? {} : { to: `/topic/word/${slug}/${word.id}` })
        }" :class="word.locked ? 'opacity-40 pointer-events-none select-none' : ''"
          :style="{ background: word.tileColor }" />
      </div>
    </section>
  </main>
</template>
