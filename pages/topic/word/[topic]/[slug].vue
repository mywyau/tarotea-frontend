<script setup lang="ts">

definePageMeta({
    middleware: ['topic-word-access'],
    ssr: true,
})

import { masteryXp } from '~/utils/xp/helpers'

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

            <div class="flex items-center justify-between gap-4">
                <NuxtLink v-if="prevWord" :to="`/topic/word/${topic}/${prevWord.id}`"
                    class="text-6xl text-gray-800 hover:text-blue-500 hover:brightness-125 transition" aria-label="Previous word">
                    ‹
                </NuxtLink>

                <div v-else class="w-6" />

                <NuxtLink v-if="nextWord" :to="`/topic/word/${topic}/${nextWord.id}`"
                    class="text-6xl text-gray-800 hover:text-blue-500 hover:brightness-125 transition" aria-label="Next word">
                    ›
                </NuxtLink>
            </div>

            <div class="flex items-center justify-center gap-3">
                <AudioButton v-if="word.audio?.word" :src="`${cdnBase}/audio/${word.audio.word}`" :playback-rate="playbackRate" size="lg" />

                <NuxtLink :to="`/writing/${topic}/vocab/${word.id}`"
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
                            <div class="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                                <NuxtLink :to="`/writing/${topic}/sentences/${word.id}/${index}`"
                                    class="inline-flex items-center justify-center rounded-md border bg-white px-2 py-1 text-xs shadow-sm transition hover:bg-gray-50">
                                    <span class="text-black">✏️</span>
                                </NuxtLink>

                                <NuxtLink
                                    :to="`/echo-lab/pronunciation-check/topic/${topic}/sentences/${word.id}/v2/${index}`"
                                    class="topic-btn-blue inline-flex items-center justify-center rounded-md px-2 py-1 text-xs shadow-sm transition">
                                    <span class="text-black">▶︎</span>
                                </NuxtLink>

                                <AudioButton v-if="word.audio?.examples?.[index]"
                                    :src="`${cdnBase}/audio/${word.audio.examples[index]}`"
                                    :playback-rate="playbackRate" size="sm" />
                            </div>
                        </div>

                        <!-- sentence on its own line -->
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

.topic-btn-blue {
    background: rgb(115, 159, 255);
    transition: background-color 0.2s ease;
}

.topic-btn-blue:hover {
    background: rgb(159, 189, 255);
}
</style>