<!-- <script setup lang="ts">

definePageMeta({
  // middleware: ['topic-access'],
  ssr: true,
})

import WordTile from '@/components/WordTile.vue'
import { createError } from 'nuxt/app'
import { computed, onMounted, ref } from 'vue'
import { FREE_WORD_LIMIT } from '~/config/topic/topics-config'
import { tileColours } from '~/utils/branding/helpers'
import { canAccessTopic, freeTopics } from '~/utils/topics/permissions'
import { masteryXp } from '~/utils/xp/helpers'

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

const isTopicFree = computed(() => {
  return freeTopics.has(slug)
})

const TILE_COLORS = tileColours


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

const isMastered = (id: string) =>
  (progressMap.value?.[id]?.xp ?? 0) >= masteryXp

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
  <main v-if="authReady" class="max-w-4xl mx-auto px-4 py-12 space-y-10">

    <NuxtLink :to="`/topics`" class="text-sm text-black hover:underline">
      ← Back
    </NuxtLink>

    <header class="rounded-lg header-card">
      <h1 class="topic-heading">{{ topic.title }}</h1>
      <p class="topic-subheading mt-2">{{ topic.description }}</p>
    </header>

    <section v-for="category in gatedCategories" :key="category.key" class="space-y-6">

      <div class="flex items-baseline justify-between gap-4">
        <h2 class="category-heading">
          {{ category.title }}
        </h2>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">

        <WordTile v-for="word in category.words" :key="word.id" :id="word.id" v-bind="{
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

<style scoped>
.topic-heading {
  font-size: 1.3rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(0, 0, 0);
}

.topic-subheading {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.65);
}

.category-heading {
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(0, 0, 0);
}
</style> -->