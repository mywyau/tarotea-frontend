<script setup lang="ts">

definePageMeta({
    ssr: true,
    // middleware: ['topic-word-access-v2'],
    middleware: ["word-access"]
})

import { masteryXp } from '@/config/xp/helpers';

type TopicIndex = {
    topic: string
    title: string
    description: string
    categories: Record<string, Array<{
        id: string
        word: string
        jyutping: string
        meaning: string
    }>>
}

type TopicWordItem = {
    id: string
    word: string
    jyutping: string
    meaning: string
    categoryKey: string
}

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

const { authReady } = useMeStateV2() // for now just to prevent hydration redirect jitters

const slug = computed(() => decodeURIComponent(route.params.slug as string))
const topic = computed(() => route.params.topic as string)

const { data, error } = await useFetch(
    () => `/api/words/${slug.value}`,
    {
        key: () => `word-${slug.value}`,
        server: true
    }
)

const { data: topicIndex } = await useFetch<TopicIndex>(
    () => `/api/index/topics/${topic.value}`,
    {
        key: () => `topic-index-${topic.value}`,
        server: true
    }
)

const orderedTopicWords = computed<TopicWordItem[]>(() => {
    const categories = topicIndex.value?.categories
    if (!categories) return []

    return Object.entries(categories).flatMap(([categoryKey, words]) =>
        words.map((entry) => ({
            ...entry,
            categoryKey
        }))
    )
})

const currentIndex = computed(() => {
    const currentWordId = word.value?.id
    if (!currentWordId) return -1

    return orderedTopicWords.value.findIndex((entry) => entry.id === currentWordId)
})

const prevWord = computed(() => {
    const i = currentIndex.value
    if (i <= 0) return null
    return orderedTopicWords.value[i - 1]
})

const nextWord = computed(() => {
    const i = currentIndex.value
    if (i === -1 || i >= orderedTopicWords.value.length - 1) return null
    return orderedTopicWords.value[i + 1]
})

const { volume } = useAudioVolume()


const word = computed(() => data.value)

const xp = ref<number>(0)
const streak = ref<number>(0)

const playbackRate = ref(1)


const masteryPercent = computed(() => {
    return Math.min((xp.value / masteryXp) * 100, 100)
})

const isMastered = computed(() => xp.value >= masteryXp)

onMounted(async () => {
    try {
        const { getAccessToken } = await useAuth()
        const token = await getAccessToken()

        const progressMap = await $fetch<Record<string, { xp: number; streak: number }>>(
            '/api/word-progress',
            {
                query: { wordIds: slug.value },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        )

        xp.value = progressMap[slug.value]?.xp ?? 0
        streak.value = progressMap[slug.value]?.streak ?? 0
    } catch {
        // not logged in or error → ignore
    }
})

watchEffect(() => {
    if (!word.value) return

    const topicLabel = topic.value.replace(/-/g, " ")

    useSeoMeta({
        title: `How to say "${word.value.meaning}" in Cantonese (${topicLabel}) – ${word.value.word}`,
        description: `Learn the Cantonese word for "${word.value.meaning}" in the ${topicLabel} topic. Includes pronunciation (${word.value.jyutping}) and example sentences.`,
        ogTitle: `${word.value.word} (${word.value.jyutping}) – Cantonese meaning`,
        ogDescription: `Cantonese vocabulary for "${word.value.meaning}" in ${topicLabel}.`,
        ogType: 'article',
    })
})

</script>

<template>
    <main v-if="authReady && word" class="word-page max-w-4xl mx-auto px-4 py-8 space-y-4 sm:space-y-6">

        <NuxtLink :to="`/topic/words/${topic}/v2#${word.id}`" class="text-sm text-black hover:underline">
            ← Back
        </NuxtLink>

        <!-- Word header -->
        <section class="text-center space-y-4 sm:space-y-4 word-card rounded-xl p-6 sm:p-8">

            <h1 class="text-4xl font-semibold text-gray-900">
                {{ word.word }}
            </h1>

            <div class="text-lg text-gray-500">
                {{ word.jyutping }}
            </div>

            <div class="text-lg text-gray-700">
                {{ word.meaning }}
            </div>

            <!-- XP block -->
            <div class="pt-6 space-y-3">

                <div class="flex justify-between text-sm text-gray-600 max-w-xs mx-auto">
                    <span>{{ xp }} / {{ masteryXp }} XP</span>
                    <span v-if="isMastered" class="font-semibold text-green-600">
                        ✓ Maxed
                    </span>
                </div>

                <div class="w-full max-w-xs mx-auto h-2 rounded-full overflow-hidden bg-gray-300">
                    <div class="h-2 bg-green-500 transition-all duration-700 ease-out"
                        :style="{ width: masteryPercent + '%' }" />
                </div>

            </div>

            <div class="flex items-center justify-between w-full pt-1">
                <NuxtLink v-if="prevWord" :to="`/topic/word/${topic}/${prevWord.id}`" class="edge-arrow"
                    aria-label="Previous word">
                    ‹
                </NuxtLink>

                <div v-else class="w-10" />

                <NuxtLink v-if="nextWord" :to="`/topic/word/${topic}/${nextWord.id}`" class="edge-arrow"
                    aria-label="Next word">
                    ›
                </NuxtLink>
            </div>

            <div class="main-actions-row">
                <AudioButton v-if="word.audio?.word" :src="`${cdnBase}/audio/${word.audio.word}`"
                    :playback-rate="playbackRate" size="md" class="tone-gate-play-btn main-action-btn" />

                <NuxtLink :to="`/writing/${topic}/vocab/${word.id}`"
                    class="action-chip action-chip-write main-action-btn" aria-label="Practice writing this word">
                    <span aria-hidden="true" class="mobile-action-icon">✏️</span>
                    <span class="mobile-action-label">Write</span>
                </NuxtLink>

                <NuxtLink :to="`/tone-garden/${word.id}`"
                    class="action-chip action-chip-tone-forge main-action-btn" aria-label="Open tone checker for this word">
                    <span aria-hidden="true" class="mobile-action-icon">🌿</span>
                    <span class="mobile-action-label">Tone Garden</span>
                </NuxtLink>
            </div>

        </section>

        <!-- Usage -->
        <section v-if="word.usage?.length" class="section-card rounded-xl p-6">
            <h2 class="text-lg font-semibold mb-3 text-gray-900">
                Usage
            </h2>

            <!-- REMOVE BULLETS -->
            <ul class="pl-10 list-disc space-y-2 text-gray-700">
                <li v-for="note in word.usage" :key="note">
                    {{ note }}
                </li>
            </ul>
        </section>

        <!-- Volume -->
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

            <ul class="space-y-5 list-none pl-0">
                <li v-for="(example, index) in word.examples" :key="example.sentence"
                    class="example-card rounded-lg p-4">
                    <div class="space-y-3">
                        <!-- buttons aligned right -->
                        <div class="flex justify-end">
                            <div class="example-actions-row">
                                <NuxtLink :to="`/writing/${topic}/sentences/${word.id}/${index}`"
                                    class="action-chip action-chip-sm action-chip-write example-action-btn"
                                    aria-label="Practice writing this sentence">
                                    <span aria-hidden="true" class="mobile-action-icon">✏️</span>
                                    <span class="mobile-action-label">Write</span>
                                </NuxtLink>

                                <NuxtLink
                                    :to="`/echo-lab/pronunciation-check/topic/${topic}/sentences/${word.id}/v2/${index}`"
                                    class="action-chip action-chip-sm action-chip-speak example-action-btn"
                                    aria-label="Practice pronunciation for this sentence">
                                    <span aria-hidden="true" class="mobile-action-icon">🎤</span>
                                    <span class="mobile-action-label">Speak</span>
                                </NuxtLink>

                                <AudioButton v-if="word.audio?.examples?.[index]"
                                    :src="`${cdnBase}/audio/${word.audio.examples[index]}`"
                                    :playback-rate="playbackRate" size="sm" class="tone-gate-play-btn example-action-btn" />
                            </div>
                        </div>

                        <!-- sentence on its own line -->
                        <div class="example-scroll-block">
                            <div class="example-scroll-content">
                                <div class="text-lg leading-relaxed text-gray-900 whitespace-nowrap">
                                    {{ example.sentence }}
                                </div>

                                <div class="mt-2 text-sm text-gray-500 whitespace-nowrap">
                                    {{ example.jyutping }}
                                </div>

                                <div class="mt-2 text-sm text-gray-700 whitespace-nowrap">
                                    {{ example.meaning }}
                                </div>
                            </div>
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

.example-scroll-block {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 0.15rem;
}

.example-scroll-content {
    width: max-content;
    min-width: 100%;
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

.main-actions-row {
    display: flex;
    width: 100%;
    justify-content: center;
    align-items: stretch;
    gap: 0.5rem;
    padding-top: 0.25rem;
    flex-wrap: wrap;
}

.main-action-btn {
    min-height: 2.5rem;
    gap: 0.35rem;
}

.example-actions-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
}

.example-action-btn {
    min-height: 2rem;
}

.action-chip:hover {
    border-color: #9ca3af;
    background: #f9fafb;
}

.action-chip-write {
    border-color: transparent;
    background: #F6E1E1;
}

.action-chip-write:hover {
    background: #f2d8d8;
    border-color: transparent;
}

.action-chip-speak {
    border-color: transparent;
    background: #A8CAE0;
}

.action-chip-speak:hover {
    background: #b7d4e7;
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
    min-height: 2.5rem;
    padding: 0.45rem 0.75rem !important;
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
    color: #49b0ff;
    transform: scale(1.04);
}

@media (max-width: 640px) {
    .main-actions-row {
        flex-wrap: nowrap;
        justify-content: center;
        align-items: center;
        gap: 0.35rem;
    }

    .main-action-btn {
        min-height: 2rem;
        padding: 0.3rem 0.55rem;
        font-size: 0.75rem;
        white-space: nowrap;
    }

    :deep(.main-actions-row .tone-gate-play-btn) {
        min-height: 2rem;
        padding: 0.3rem 0.5rem !important;
        font-size: 0.75rem !important;
        gap: 0.2rem !important;
    }

    :deep(.main-actions-row .tone-gate-play-btn span:last-child) {
        display: none;
    }

    .example-actions-row {
        flex-wrap: nowrap;
        gap: 0.35rem;
    }

    .example-action-btn {
        min-height: 1.9rem;
        padding: 0.25rem 0.45rem;
    }

    .mobile-action-label {
        display: none;
    }

    .mobile-action-icon {
        font-size: 0.95rem;
        line-height: 1;
    }
}
</style>
