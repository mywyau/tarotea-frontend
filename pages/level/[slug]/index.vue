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

const {
  authReady,
  isLoggedIn,
  entitlement,
} = useMeStateV2()

// const isFreeLevel = (level: number) => {
//   return level <= 2 // adjust if needed
// }


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


// const allWordsFlat = computed(() =>
//   Object.values(topic.value.categories).flat()
// )

// const freePreviewIds = computed(() =>
//   allWordsFlat.value.slice(0, 5).map((w: any) => w.id)
// )

// const canViewWord = (wordId: string) => {
//   if (hasFullAccess.value) return true
//   return freePreviewIds.value.includes(wordId)
// }

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

const FREE_WORD_LIMIT = 5

const hasPaidAccess = computed(() => {
  if (!authReady.value) return false
  if (!isLoggedIn.value) return false
  return entitlement.value ? canAccessLevel(entitlement.value) : false
})

const gatedCategories = computed(() => {
  let globalIndex = 0

  return categories.value.map(category => {
    return {
      ...category,
      words: category.words.map((word: any) => {

        const shouldLock =
          !isFreeLevel(levelNumber) &&
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
  <main class="level-page max-w-4xl mx-auto px-4 py-10 sm:py-12 space-y-10">

    <header class="header-card rounded-xl p-6 sm:p-7 space-y-2">
      <h1 class="text-3xl font-semibold text-gray-900">{{ topic.title }}</h1>
      <p class="text-gray-700">{{ topic.description }}</p>
    </header>

    <section v-for="category in gatedCategories" :key="category.key" class="category-card rounded-xl p-5 sm:p-6">
      <div class="flex items-baseline justify-between gap-4">
        <h2 class="text-xl font-semibold capitalize text-gray-900">
          {{ category.title }}
        </h2>
      </div>

      <div class="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <WordTile v-for="word in category.words" :key="word.id"
          :to="word.locked ? undefined : `/level/${slug}/word/${word.id}`" :word="word.word" :jyutping="word.jyutping"
          :meaning="word.meaning" :xp="getXp(word.id)" :mastered="isMastered(word.id)"
          :class="word.locked ? 'locked-tile' : ''" />
      </div>
    </section>

  </main>
</template>

<style scoped>
.level-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;

  /* background: linear-gradient(180deg,
      rgba(246, 225, 225, 0.70) 0%,
      rgba(255, 255, 255, 0.85) 45%,
      rgba(168, 202, 224, 0.40) 100%); */

  /* border-radius: 18px; */
  padding-bottom: 2rem;
}

.header-card {
  background: rgba(255, 255, 255, 0.72);
  /* border: 1px solid rgba(214, 163, 209, 0.38); */
  /* purple border */
  backdrop-filter: blur(6px);
}

.category-card {
  background: rgba(255, 255, 255, 0.72);
  /* border: 1px solid rgba(234, 184, 228, 0.30); */
  /* pink border */
  backdrop-filter: blur(6px);
}

.category-card:hover {
  border-color: rgba(214, 163, 209, 0.55);
}

.locked-tile {
  opacity: 0.38;
  pointer-events: none;
  user-select: none;
  filter: grayscale(0.15);
}

/* Small “Pro” pill */
.pill {
  display: inline-block;
  /* padding: 0.2rem 0.55rem; */
  /* border-radius: 999px; */
  font-size: 0.75rem;
  font-weight: 700;
  /* border: 1px solid rgba(0, 0, 0, 0.06); */
  color: rgba(0, 0, 0, 0.78);
}

.pill-locked {
  background: rgba(244, 205, 39, 0.60);
}
</style>