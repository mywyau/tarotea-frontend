<script setup lang="ts">

definePageMeta({
    middleware: ['topic-word-access'],
    ssr: true,
})

const route = useRoute()
const runtimeConfig = useRuntimeConfig()

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

const { volume } = useAudioVolume()

const cdnBase = runtimeConfig.public.cdnBase

const word = computed(() => data.value)
const notFound = computed(() => error.value?.statusCode === 404)

const xp = ref<number>(0)
const streak = ref<number>(0)

const MASTERY_XP = 200

const masteryPercent = computed(() => {
    return Math.min((xp.value / MASTERY_XP) * 100, 100)
})

const isMastered = computed(() => xp.value >= MASTERY_XP)

const formattedTopic = computed(() =>
    topic.value
        .replace(/-/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase())
)


onMounted(async () => {
    try {
        const { getAccessToken } = await useAuth()
        const token = await getAccessToken()

        const progressMap = await $fetch<
            Record<string, { xp: number; streak: number }>
        >(
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

        console.log("XP loaded:", xp.value)
        console.log("Streak loaded:", streak.value)
        console.log("Word ID:", slug.value)

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

    useHead({
        script: [
            {
                type: 'application/ld+json',
                children: JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "DefinedTerm",
                    name: word.value.word,
                    description: word.value.meaning,
                    inDefinedTermSet: `Cantonese ${topicLabel} Vocabulary`,
                })
            }
        ]
    })
})

</script>

<template>
    <main v-if="authReady && word" class="word-page max-w-4xl mx-auto px-4 py-8 space-y-6 sm:space-y-8">

        <!-- Back link -->
        <NuxtLink :to="`/topic/words/${topic}`" class="inline-block text-sm text-black hover:underline">
            ← {{ formattedTopic }} Vocabulary
        </NuxtLink>

        <!-- Word header -->
        <section class="text-center space-y-3 sm:space-y-4 word-card rounded-xl p-6 sm:p-8">

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
                    <span>{{ xp }} XP</span>
                    <span v-if="isMastered" class="font-semibold text-yellow-600">
                        ✓ Maxed
                    </span>
                </div>

                <div class="w-full max-w-xs mx-auto h-2 rounded-full overflow-hidden bg-gray-300">
                    <div class="h-2 bg-green-500 transition-all duration-700 ease-out"
                        :style="{ width: masteryPercent + '%' }" />
                </div>

            </div>

            <div class="pt-5 sm:pt-6">
                <AudioButton v-if="word.audio?.word" :src="`${cdnBase}/audio/${word.audio.word}`" size="lg" />
            </div>

        </section>

        <!-- Usage -->
        <section v-if="word.usage?.length" class="section-card rounded-xl p-6">
            <h2 class="text-lg font-semibold mb-3 text-gray-900">
                Usage
            </h2>

            <!-- REMOVE BULLETS -->
            <ul class="space-y-2 text-gray-700">
                <li v-for="note in word.usage" :key="note">
                    {{ note }}
                </li>
            </ul>
        </section>

        <!-- Volume -->
        <div class="flex items-center justify-center gap-3 text-sm text-gray-600">
            <span>Volume</span>
            <input type="range" min="0" max="1" step="0.01" v-model="volume" class="w-32 accent-black" />
            <span class="w-8 tabular-nums">
                {{ Math.round(volume * 100) }}%
            </span>
        </div>

        <!-- Examples -->
        <section v-if="word.examples?.length" class="section-card rounded-xl p-6">

            <h2 class="text-lg font-semibold mb-4 text-gray-900">
                Examples
            </h2>

            <ul class="space-y-5 list-none pl-0">
                <li v-for="(example, index) in word.examples" :key="example.sentence"
                    class="example-card rounded-lg p-4">
                    <div class="space-y-2">
                        <div class="flex items-center justify-between gap-4">
                            <span class="text-lg text-gray-900">
                                {{ example.sentence }}
                            </span>

                            <AudioButton v-if="word.audio?.examples?.[index]"
                                :src="`${cdnBase}/audio/${word.audio.examples[index]}`" size="sm" />
                        </div>

                        <div class="text-sm text-gray-500">
                            {{ example.jyutping }}
                        </div>

                        <div class="text-sm text-gray-700">
                            {{ example.meaning }}
                        </div>
                    </div>
                </li>
            </ul>
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
    /* background: rgba(255, 255, 255, 0.75); */
    /* border: 1px solid rgba(214, 163, 209, 0.35); */
    backdrop-filter: blur(6px);
}

/* Section cards */
.section-card {
    /* background: rgba(255, 255, 255, 0.75); */
    /* border: 1px solid rgba(234, 184, 228, 0.30); */
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
</style>