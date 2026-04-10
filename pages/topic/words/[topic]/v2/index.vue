<script setup lang="ts">
definePageMeta({
  // middleware: ['topic-access'],
  ssr: true,
})

import WordTile from '@/components/WordTile.vue'
import { createError } from 'nuxt/app'
import { FREE_WORD_LIMIT } from '~/config/topic/topics-config'
import { tileColours } from '~/utils/branding/helpers'
import { canAccessTopic, freeTopics } from '~/utils/topics/permissions'
import { masteryXp } from '~/utils/xp/helpers'

const route = useRoute()
const slug = route.params.topic as string

const {
  isLoggedIn,
  entitlement,
} = useMeStateV2()

const { data: topic, error } = await useFetch(
  `/api/index/topics/${slug}`,
  {
    server: true,
  }
)

const unlockMap = ref<Record<string, true>>({})

const unlockSummary = ref({
  totalXp: 0,
  creditsEarned: 0,
  creditsSpent: 0,
  creditsAvailable: 0,
})

if (error.value?.statusCode === 403) {
  throw createError({ statusCode: 403, statusMessage: 'Topic locked' })
}

if (!topic.value) {
  throw createError({ statusCode: 404, statusMessage: 'Topic not found' })
}

const isTopicFree = computed(() => {
  return freeTopics.has(slug)
})

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

async function loadUnlocks() {
  try {
    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()

    const wordIds = Object.values(topic.value.categories)
      .flat()
      .map((w: any) => w.id)

    if (!wordIds.length) return

    const result = await $fetch<{
      totalXp: number
      creditsEarned: number
      creditsSpent: number
      creditsAvailable: number
      unlockedWordIds: string[]
    }>('/api/word-unlocks', {
      query: { wordIds: wordIds.join(',') },
      headers: { Authorization: `Bearer ${token}` }
    })

    unlockSummary.value = {
      totalXp: result.totalXp,
      creditsEarned: result.creditsEarned,
      creditsSpent: result.creditsSpent,
      creditsAvailable: result.creditsAvailable,
    }

    unlockMap.value = Object.fromEntries(
      result.unlockedWordIds.map((id) => [id, true as const])
    )
  } catch {
    unlockMap.value = {}
    unlockSummary.value = {
      totalXp: 0,
      creditsEarned: 0,
      creditsSpent: 0,
      creditsAvailable: 0,
    }
  }
}

const getXp = (id: string) =>
  progressMap.value?.[id]?.xp ?? 0

const isMastered = (id: string) =>
  (progressMap.value?.[id]?.xp ?? 0) >= masteryXp

const hasPaidAccess = computed(() => {
  return canAccessTopic(isLoggedIn.value, entitlement.value, topic.value.id)
})

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
        const paywallLocked =
          !isTopicFree.value &&
          !hasPaidAccess.value &&
          globalIndex >= FREE_WORD_LIMIT

        const unlockedByUser = !!unlockMap.value[word.id]
        const locked = paywallLocked && !unlockedByUser

        globalIndex++

        return {
          ...word,
          paywallLocked,
          unlockedByUser,
          locked,
          tileColor: getColorFromId(word.id)
        }
      })
    }
  })
})

onMounted(async () => {
  await Promise.all([
    loadProgress(),
    loadUnlocks(),
  ])
})
</script>

<template>
  <main class="topic-page max-w-4xl mx-auto px-4 py-10 sm:py-12 space-y-10">

    <NuxtLink :to="`/topics`" class="text-sm text-black hover:underline">
      ← Back
    </NuxtLink>

    <header class="rounded-lg header-card">
      <h1 class="topic-heading">{{ topic.title }}</h1>
      <p class="topic-subheading mt-2">{{ topic.description }}</p>
    </header>

    <div
      v-if="!canAccessTopic(isLoggedIn, entitlement, topic.id)"
      class="unlock-summary"
    >
      TaroKeys: <span class="font-bold">{{ unlockSummary.creditsAvailable }}</span>
    </div>

    <section
      v-for="category in gatedCategories"
      :key="category.key"
      class="space-y-6"
    >
      <div class="flex items-baseline justify-between gap-4">
        <h2 class="category-heading">
          {{ category.title }}
        </h2>
      </div>

      <div class="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <div
          v-for="word in category.words"
          :key="word.id"
          :id="word.id"
          class="tile-shell"
        >
          <WordTile
            :id="word.id"
            :to="word.locked
              ? `/topic/${slug}/unlock/${word.id}`
              : `/topic/word/${slug}/${word.id}`"
            :word="word.word"
            :jyutping="word.jyutping"
            :meaning="word.meaning"
            :xp="getXp(word.id)"
            :mastered="isMastered(word.id)"
            :class="word.locked ? 'locked-tile' : ''"
            :style="{ background: word.tileColor }"
          />
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.topic-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;

  padding-bottom: 2rem;
}

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

.header-card {
  backdrop-filter: blur(6px);
}

.tile-shell {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.locked-tile {
  opacity: 0.38;
  user-select: none;
  filter: grayscale(0.15);
}

.unlock-summary {
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.75);
}
</style>