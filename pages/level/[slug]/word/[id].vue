<script setup lang="ts">
import { masteryXp } from '@/config/xp/helpers';
import { useAudioVolume } from '~/composables/useAudioVolume';
import { useAuth } from '~/composables/useAuth';


definePageMeta({
  ssr: true,
  // middleware: ['level-word-access-v2-client'],
  middleware: ["word-access"]
})


type LevelIndex = {
  id?: string
  slug?: string
  title?: string
  description?: string
  categories?: Record<string, Array<{
    id: string
    word: string
    jyutping: string
    meaning: string
  }>>
  words?: Array<{
    id: string
    word: string
    jyutping: string
    meaning: string
  }>
}

type LevelWordItem = {
  id: string
  word: string
  jyutping: string
  meaning: string
  categoryKey?: string
}

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

// Dynamic params
const level = computed(() => route.params.slug as string)
const id = computed(() => decodeURIComponent(route.params.id as string))

// Fetch word data
const { data, error } = await useFetch(
  () => `/api/words/${id.value}`,
  {
    key: () => `word-${id.value}`,
    server: true,
  }
)

const { data: levelIndex } = await useFetch<LevelIndex>(
  () => `/api/index/levels/${level.value}`,
  {
    key: () => `level-index-${level.value}`,
    server: true,
    credentials: 'include',
  }
)

const orderedLevelWords = computed<LevelWordItem[]>(() => {
  if (levelIndex.value?.categories) {
    return Object.entries(levelIndex.value.categories).flatMap(([categoryKey, words]) =>
      words.map((entry) => ({
        ...entry,
        categoryKey
      }))
    )
  }

  if (levelIndex.value?.words) {
    return levelIndex.value.words.map((entry) => ({
      ...entry
    }))
  }

  return []
})

const currentIndex = computed(() => {
  const currentWordId = word.value?.id
  if (!currentWordId) return -1

  return orderedLevelWords.value.findIndex((entry) => entry.id === currentWordId)
})

const prevWord = computed(() => {
  const i = currentIndex.value
  if (i <= 0) return null
  return orderedLevelWords.value[i - 1]
})

const nextWord = computed(() => {
  const i = currentIndex.value
  if (i === -1 || i >= orderedLevelWords.value.length - 1) return null
  return orderedLevelWords.value[i + 1]
})

const { volume } = useAudioVolume()

const word = computed(() => data.value)
const notFound = computed(() => error.value?.statusCode === 404)

// Format level label (level-four → Level Four)
const formattedLevel = computed(() => {
  return level.value
    .replace(/-/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
})

const masteryPercent = computed(() => {
  const value = xp.value ?? 0
  return Math.min((value / masteryXp) * 100, 100)
})

const xp = ref<number>(0)
const streak = ref<number>(0)

const isMastered = computed(() => xp.value >= masteryXp)

const playbackRate = ref(1)

onMounted(async () => {
  try {
    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()


    const progressMap = await $fetch<
      Record<string, { xp: number; streak: number }>
    >(
      '/api/word-progress',
      {
        query: { wordIds: id.value },
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    xp.value = progressMap[id.value]?.xp ?? 0
    streak.value = progressMap[id.value]?.streak ?? 0

  } catch (err) {
    // not logged in or failed → ignore
  }
})

// ✅ SEO META (runs when word loads)
watchEffect(() => {
  if (!word.value) return

  useSeoMeta({
    title: `How to say "${word.value.meaning}" in Cantonese – ${word.value.word} (${word.value.jyutping}) | TaroTea`,
    description: `Learn how to say "${word.value.meaning}" in Cantonese. Includes pronunciation (${word.value.jyutping}), example sentences and audio.`,
    ogTitle: `How to say "${word.value.meaning}" in Cantonese`,
    ogDescription: `Cantonese word: ${word.value.word} (${word.value.jyutping}). Includes audio and example sentences.`,
    ogType: 'article',
  })
})

</script>

<template>

  <main v-if="word" class="word-page max-w-4xl mx-auto px-4 py-8 space-y-4 sm:space-y-4">

    <NuxtLink :to="`/level/${level}/v2#${word.id}`" class="text-sm text-black hover:underline">
      ← Back
    </NuxtLink>


    <!-- Word header -->
    <section class="text-center space-y-4 sm:space-y-6 word-card rounded-xl p-6 sm:p-8">

      <h1 class="text-4xl font-semibold text-black">
        {{ word.word }}
      </h1>

      <div class="text-lg text-black">
        {{ word.jyutping }}
      </div>

      <div class="text-lg text-black">
        {{ word.meaning }}
      </div>

      <!-- XP block -->
      <div class="pt-4 space-y-4">

        <div class="flex justify-between text-sm text-gray-600 max-w-xs mx-auto">
          <span>{{ xp }} / {{ masteryXp }} XP</span>
          <span v-if="isMastered" class="font-semibold text-green-600">
            ✓ Maxed
          </span>
        </div>

        <!-- Progress bar -->
        <div class="w-full max-w-xs mx-auto h-2 rounded-full overflow-hidden bg-gray-300">
          <div class="h-2 bg-green-500 transition-all duration-700 ease-out" :style="{ width: masteryPercent + '%' }" />
        </div>
      </div>

      <div class="flex items-center justify-between w-full pt-1">
        <NuxtLink v-if="prevWord" :to="`/level/${level}/word/${prevWord.id}`" class="edge-arrow"
          aria-label="Previous word">
          ‹
        </NuxtLink>

        <div v-else class="w-10" />

        <NuxtLink v-if="nextWord" :to="`/level/${level}/word/${nextWord.id}`" class="edge-arrow" aria-label="Next word">
          ›
        </NuxtLink>
      </div>

      <div class="flex items-center justify-center gap-3 pt-1">

        <AudioButton v-if="word.audio?.word" :src="`${cdnBase}/audio/${word.audio.word}`" :playback-rate="playbackRate"
          size="md" class="tone-gate-play-btn" />

        <NuxtLink :to="`/writing/${level}/vocab/${word.id}`" class="action-chip action-chip-write"
          aria-label="Practice writing this word">
          ✏️ Write
        </NuxtLink>

        <NuxtLink :to="`/tone-garden/${word.id}`" class="action-chip action-chip-tone-forge"
          aria-label="Open tone checker for this word">
          Tone Garden
        </NuxtLink>
      </div>

    </section>

    <!-- Usage -->
    <section v-if="word.usage?.length" class="section-card rounded-xl p-6">
      <h2 class="text-lg font-semibold mb-3 text-gray-900">
        Usage
      </h2>

      <ul class="pl-10 list-disc space-y-2 text-gray-700">
        <li v-for="note in word.usage" :key="note">
          {{ note }}
        </li>
      </ul>
    </section>

    <!-- Volume and text speed -->
    <!-- Volume and speed -->
    <div class="mx-auto grid w-fit grid-cols-[auto_auto] items-center gap-x-4 gap-y-3 text-sm text-gray-600">
      <span class="text-left">Volume</span>

      <div class="flex items-center gap-3">
        <input type="range" min="0" max="1" step="0.01" v-model="volume" class="w-32 accent-black" />
        <span class="w-8 tabular-nums">
          {{ Math.round(volume * 100) }}%
        </span>
      </div>

      <span class="text-left">Speed</span>

      <div class="flex items-center">
        <select v-model.number="playbackRate" class="rounded border px-2 py-1">
          <option :value="1.4">1.4x</option>
          <option :value="1.2">1.2x</option>
          <option :value="1">1.0x</option>
          <option :value="0.80">0.8x</option>
          <option :value="0.6">0.6x</option>
        </select>
      </div>
    </div>

    <!-- Examples -->
    <section v-if="word.examples?.length" class="section-card rounded-xl p-6">

      <h2 class="text-lg font-semibold mb-4 text-gray-900">
        Examples
      </h2>

      <ul class="space-y-5">
        <li v-for="(example, index) in word.examples" :key="example.sentence" class="example-card rounded-lg p-4">
          <div class="space-y-3">
            <div class="flex justify-end">
              <div class="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                <NuxtLink :to="`/writing/${level}/sentences/${word.id}/${index}`" class="action-chip action-chip-sm action-chip-write"
                  aria-label="Practice writing this sentence">
                  ✏️ Write
                </NuxtLink>

                <NuxtLink :to="`/echo-lab/pronunciation-check/level/${level}/sentences/${word.id}/v2/${index}`"
                  class="action-chip action-chip-sm action-chip-speak" aria-label="Practice pronunciation for this sentence">
                  ▶ Speak
                </NuxtLink>

                <AudioButton v-if="word.audio?.examples?.[index]"
                  :src="`${cdnBase}/audio/${word.audio.examples[index]}`" :playback-rate="playbackRate" size="sm"
                  class="tone-gate-play-btn" />
              </div>
            </div>

            <div class="text-lg leading-relaxed text-gray-900 break-words">
              {{ example.sentence }}
            </div>

            <div class="text-sm text-gray-500 break-words">
              {{ example.jyutping }}
            </div>

            <div class="text-sm text-gray-700 break-words">
              {{ example.meaning }}
            </div>
          </div>
        </li>
      </ul>

      <div class="text-center mt-10">
        <p class="text-center mt-10 text-sm"> Spot an error? Report to:
          <a href="mailto:errors@tarotea.co.uk" class="font-medium text-gray-600">
            errors@tarotea.co.uk
          </a>
        </p>
      </div>

    </section>

  </main>

  <div v-else-if="notFound" class="max-w-xl mx-auto px-4 py-24 text-center text-gray-600">
    Word not found
  </div>
</template>

<style scoped>
.word-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;

  border-radius: 18px;
  padding-bottom: 2rem;
}

/* Main word card */
.word-card {
  backdrop-filter: blur(6px);
}

/* Section cards */
.section-card {
  backdrop-filter: blur(6px);
}

/* Examples */
.example-card {
  background: rgba(168, 202, 224, 0.20);
  border-left: 4px solid rgba(168, 202, 224, 0.70);
}

/* Progress bar */
.progress-bar {
  background: linear-gradient(90deg,
      #D6A3D1,
      #EAB8E4);
}

.action-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #111827;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.45rem 0.75rem;
  border-radius: 0.6rem;
  transition: all 0.2s ease;
}

.action-chip:hover {
  border-color: #9ca3af;
  background: #f9fafb;
}

.action-chip-write {
  border-color: transparent;
  background: #A8CAE0;
}

.action-chip-write:hover {
  background: #b7d4e7;
  border-color: transparent;
}

.action-chip-speak {
  border-color: transparent;
  background: #F4C2D7;
}

.action-chip-speak:hover {
  background: #f6cde0;
  border-color: transparent;
}

.action-chip-tone-forge {
  border-color: transparent;
  background: #CDE8C9;
}

.action-chip-tone-forge:hover {
  background: #d8edd4;
  border-color: transparent;
}

.action-chip-sm {
  font-size: 0.75rem;
  padding: 0.3rem 0.55rem;
}

:deep(.tone-gate-play-btn) {
  border-color: transparent !important;
  background: #D6A3D1 !important;
}

:deep(.tone-gate-play-btn:hover) {
  background: #deafda !important;
  border-color: transparent !important;
}

.edge-arrow {
  font-size: 4rem;
  line-height: 1;
  color: #4b5563;
  transition: color 0.2s ease, transform 0.2s ease;
}

.edge-arrow:hover {
  color: #5162ff;
  transform: scale(1.04);
}
</style>
