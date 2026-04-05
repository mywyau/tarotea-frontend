<script setup lang="ts">
import { useAudioVolume } from '~/composables/useAudioVolume'
import { useAuth } from '~/composables/useAuth'
import { masteryXp } from '~/utils/xp/helpers'

import BackLink from '~/components/BackLink.vue'


definePageMeta({
  middleware: ['level-word-access-client'],
  ssr: true,
})

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

const goBack = useGoBack()


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

    <BackLink />

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

      <div class="flex items-center justify-center gap-3">

        <AudioButton v-if="word.audio?.word" :src="`${cdnBase}/audio/${word.audio.word}`" :playback-rate="playbackRate"
          size="lg" />

        <NuxtLink :to="`/writing/${level}/vocab/${word.id}`"
          class="bg-white hover:bg-gray-50 inline-flex items-center justify-center text-base px-4 py-3 rounded-md shadow-sm transition border">
          <span class="text-white">✏️</span>
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
                <NuxtLink :to="`/writing/${level}/sentences/${word.id}/${index}`"
                  class="inline-flex items-center justify-center rounded-md border bg-white px-2 py-1 text-xs shadow-sm transition hover:bg-gray-50">
                  <span class="text-black">✏️</span>
                </NuxtLink>

                <NuxtLink :to="`/echo-lab/pronunciation-check/level/${level}/sentences/${word.id}/v2/${index}`"
                  class="level-btn-blue inline-flex items-center justify-center rounded-md px-2 py-1 text-xs shadow-sm transition">
                  <span class="text-black">▶︎</span>
                </NuxtLink>

                <AudioButton v-if="word.audio?.examples?.[index]"
                  :src="`${cdnBase}/audio/${word.audio.examples[index]}`" :playback-rate="playbackRate" size="sm" />
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

.level-btn-blue {
  background: rgb(115, 159, 255);
  transition: background-color 0.2s ease;
}

.level-btn-blue:hover {
  background: rgb(159, 189, 255);
}

.level-btn-black {
  background: rgb(63, 63, 63);
  transition: background-color 0.2s ease;
}

.level-btn-black:hover {
  background: rgb(0, 0, 0);
}
</style>