<script setup lang="ts">

definePageMeta({
  // middleware: ['level-access'],
  ssr: true,
})

import WordTile from '@/components/WordTile.vue'
import { createError } from 'nuxt/app'
import { useRoute } from 'vue-router'
import { FREE_LEVEL_WORD_LIMIT } from '~/config/level/levels-config'
import { tileColours } from '~/utils/branding/helpers'
import { isLevelId, levelIdToNumbers } from '~/utils/levels/levels'
import { canAccessLevel, isFreeLevel } from '~/utils/levels/permissions'
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

// SSR-safe fetch (no gating, no nulls)
const { data: levelCdnData, error } = await useFetch(
  `/api/index/levels/${slug}`,
  {
    server: true,
    credentials: 'include', // 👈 cookies
  }
)


const unlockMap = ref<Record<string, true>>({})

const unlockSummary = ref({
  totalXp: 0,
  creditsEarned: 0,
  creditsSpent: 0,
  creditsAvailable: 0,
})

const unlockingWordId = ref<string | null>(null)

async function loadUnlocks() {
  try {
    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()

    const wordIds = Object.values(levelCdnData.value.categories)
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

async function unlockWord(wordId: string) {
  if (unlockingWordId.value) return
  if (unlockSummary.value.creditsAvailable < 1) return

  try {
    unlockingWordId.value = wordId

    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()

    const result = await $fetch<{
      ok: boolean
      alreadyUnlocked?: boolean
      wordId: string
      totalXp?: number
      creditsEarned?: number
      creditsSpent?: number
      creditsAvailable?: number
    }>('/api/word-unlocks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { wordId }
    })

    unlockMap.value = {
      ...unlockMap.value,
      [wordId]: true,
    }

    if (!result.alreadyUnlocked) {
      unlockSummary.value = {
        totalXp: result.totalXp ?? unlockSummary.value.totalXp,
        creditsEarned: result.creditsEarned ?? unlockSummary.value.creditsEarned,
        creditsSpent: result.creditsSpent ?? unlockSummary.value.creditsSpent,
        creditsAvailable: result.creditsAvailable ?? unlockSummary.value.creditsAvailable,
      }
    }
  } finally {
    unlockingWordId.value = null
  }
}

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

    const wordIds = Object.values(levelCdnData.value.categories)
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

// const FREE_WORD_LIMIT = 10

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
          !isFreeLevel(levelNumber) &&
          !canAccessLevel(isLoggedIn.value, entitlement.value) &&
          globalIndex >= FREE_LEVEL_WORD_LIMIT

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
  <main class="level-page max-w-4xl mx-auto px-4 py-10 sm:py-12 space-y-10">

    <BackLink />

    <header class="rounded-lg header-card">
      <h1 class="level-heading">{{ levelCdnData.title }}</h1>
      <p class="level-subheading mt-2">{{ levelCdnData.description }}</p>
    </header>

    <div v-if="!canAccessLevel(isLoggedIn, entitlement)" class="unlock-summary ">
      TaroKeys: <span class="font-bold">{{ unlockSummary.creditsAvailable }}</span>
    </div>

    <section v-for="category in gatedCategories" :key="category.key" class="space-y-6">

      <div class="flex items-baseline justify-between gap-4">
        <h2 class="category-heading">
          {{ category.title }}
        </h2>
      </div>

      <div class="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <div v-for="word in category.words" :key="word.id" :id="word.id" class="tile-shell">
          <WordTile :id="word.id" :to="word.locked
            ? `/level/${slug}/unlock/${word.id}`
            : `/level/${slug}/word/${word.id}`" :word="word.word" :jyutping="word.jyutping" :meaning="word.meaning"
            :xp="getXp(word.id)" :mastered="isMastered(word.id)" :class="word.locked ? 'locked-tile' : ''"
            :style="{ background: word.tileColor }" />

          <!-- <div v-if="word.locked" class="unlock-row">
            <button class="unlock-button" :disabled="unlockSummary.creditsAvailable < 1 || unlockingWordId === word.id"
              @click="unlockWord(word.id)">
              {{
                unlockingWordId === word.id
                  ? 'Unlocking...'
                  : unlockSummary.creditsAvailable > 0
                    ? 'Unlock word'
                    : 'No credits'
              }}
            </button>
          </div> -->
        </div>
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

.level-heading {
  font-size: 1.3rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(0, 0, 0);
}

.level-subheading {
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

.category-card {
  backdrop-filter: blur(6px);
}

.category-card:hover {
  border-color: rgba(214, 163, 209, 0.55);
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

.unlock-row {
  display: flex;
  justify-content: center;
}

.unlock-button {
  border: 0;
  border-radius: 100px;
  padding: 0.55rem 0.85rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: rgba(255, 255, 255, 0.92);
  color: #111827;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}

.unlock-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.unlock-summary {
  font-size: 1.0rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.75);
}
</style>