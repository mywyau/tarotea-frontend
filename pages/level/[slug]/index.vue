<script setup lang="ts">

definePageMeta({
  // middleware: ['level-access'],
  ssr: true,
})

import WordTile from '@/components/WordTile.vue'
import { createError } from 'nuxt/app'
import { useRoute } from 'vue-router'
import { tileColours } from '~/utils/branding/helpers'
import { isLevelId, levelIdToNumbers } from '~/utils/levels/levels'
import { canAccessLevel, hasPaidAccess, isFreeLevel } from '~/utils/levels/permissions'
import { masteryXp } from '~/utils/xp/helpers'

const route = useRoute()
const slug = route.params.slug as string

// we check the path slug
if (!isLevelId(slug)) {
  throw createError({ statusCode: 404 })
}

const levelNumber: number = levelIdToNumbers(slug)

const {
  authReady,
  isLoggedIn,
  entitlement,
} = useMeStateV2()

if (!entitlement.value === null) {
  throw createError({ statusCode: 404 })
}

// SSR-safe fetch (no gating, no nulls)
const { data: levelCdnData, error } = await useFetch(
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

if (!levelCdnData.value) {
  throw createError({ statusCode: 404, statusMessage: 'Level not found' })
}

const categories = computed(() =>
  Object.entries(levelCdnData.value.categories).map(([key, words]) => ({
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

const getXp = (id: string) =>
  progressMap.value?.[id]?.xp ?? 0

const isMastered = (id: string) =>
  (progressMap.value?.[id]?.xp ?? 0) >= masteryXp

const FREE_WORD_LIMIT = 10

// const canAccessLevel = computed(() => {
//   if (!authReady.value) return false
//   if (!isLoggedIn.value) return false
//   return entitlement.value ? hasPaidAccess(entitlement.value) : false
// })

// const canAccessLevel = computed(() => {
//   return entitlement.value ? hasPaidAccess(entitlement.value) : false
// })

function getColorFromId(id: string) {
  let hash = 0

  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }

  const index = Math.abs(hash) % tileColours.length
  return tileColours[index]
}

const gatedCategories = computed(() => {

  let globalIndex = 0

  return categories.value.map(category => {
    return {
      ...category,
      words: category.words.map((word: any) => {

        const shouldLock =
          !isFreeLevel(levelNumber) &&
          !canAccessLevel(isLoggedIn.value, entitlement.value) &&
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

onMounted(loadProgress)

</script>

<template>
  <main class="level-page max-w-4xl mx-auto px-4 py-10 sm:py-12 space-y-6">

    <NuxtLink :to="`/levels`" class="inline-block text-sm text-black hover:underline">
      ← Levels
    </NuxtLink>

    <header class="header-card rounded-xl p-6 sm:p-7 space-y-2">
      <h1 class="text-3xl font-semibold text-gray-900">{{ levelCdnData.title }}</h1>
      <p class="text-gray-700">{{ levelCdnData.description }}</p>
    </header>

    <section v-for="category in gatedCategories" :key="category.key" class="category-card rounded-xl p-5 sm:p-6">
      <div class="flex items-baseline justify-between gap-4">
        <h2 class="text-xl font-semibold capitalize text-gray-900">
          {{ category.title }}
        </h2>
      </div>

      <div class="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <WordTile v-for="word in category.words" :key="word.id"
          :to="word.locked ? null : `/level/${slug}/word/${word.id}`" :word="word.word" :jyutping="word.jyutping"
          :meaning="word.meaning" :xp="getXp(word.id)" :mastered="isMastered(word.id)"
          :class="word.locked ? 'locked-tile' : ''" :style="{ background: word.tileColor }" />
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

  padding-bottom: 2rem;
}

.header-card {
  backdrop-filter: blur(6px);
}

.category-card {
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
</style>