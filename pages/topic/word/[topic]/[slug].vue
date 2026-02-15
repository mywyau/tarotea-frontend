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

const MASTERY_XP = 1000

const masteryPercent = computed(() => {
    return Math.min((xp.value / MASTERY_XP) * 100, 100)
})

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


</script>

<template>
    <main v-if="authReady && word" class="max-w-2xl mx-auto px-4 py-12 space-y-10">

        <NuxtLink :to="`/topic/words/${topic}`" class="block text-gray-500 hover:underline">
            ← {{ topic.replace("-", " ") }}
        </NuxtLink>

        <!-- Word header -->
        <section class="text-center space-y-2">
            <div class="text-4xl font-medium">
                {{ word.word }}
            </div>

            <div class="text-lg text-gray-400">
                {{ word.jyutping }}
            </div>

            <div class="text-lg text-gray-600">
                {{ word.meaning }}
            </div>

            <!-- XP block -->
            <div class="pt-6 space-y-3">

                <div class="flex justify-between text-sm text-gray-500 max-w-xs mx-auto">
                    {{ xp }} XP
                </div>

                <div class="w-full max-w-xs mx-auto h-2 bg-gray-200 rounded overflow-hidden">
                    <div class="h-2 bg-green-500 transition-all duration-700 ease-out"
                        :style="{ width: masteryPercent + '%' }" />
                </div>
            </div>

            <div class="pt-8">
                <AudioButton v-if="word.audio?.word" :src="`${cdnBase}/audio/${word.audio.word}`" />
            </div>
        </section>

        <!-- Usage -->
        <section v-if="word.usage?.length">
            <h2 class="text-lg font-semibold mb-3">
                Usage
            </h2>

            <ul class="list-disc pl-5 space-y-2 text-gray-700">
                <li v-for="note in word.usage" :key="note">
                    {{ note }}
                </li>
            </ul>
        </section>

        <!-- ✅ ONE global volume slider -->
        <div class="flex items-center justify-center gap-3 pt-2 text-sm text-gray-500">
            <span class="select-none">Volume</span>

            <input type="range" min="0" max="1" step="0.01" v-model="volume" class="w-32 accent-black" />

            <span class="w-8 text-left tabular-nums">
                {{ Math.round(volume * 100) }}%
            </span>
        </div>

        <!-- Examples -->
        <section v-if="word.examples?.length">
            <h2 class="text-lg font-semibold mb-3">
                Examples
            </h2>

            <ul class="space-y-4">
                <li v-for="(example, index) in word.examples" :key="example.sentence"
                    class="border-l-4 border-gray-200 pl-4 py-2">
                    <div class="space-y-1">
                        <div class="flex items-center justify-between gap-4">
                            <span class="text-lg">
                                {{ example.sentence }}
                            </span>

                            <AudioButton v-if="word.audio?.examples?.[index]"
                                :src="`${cdnBase}/audio/${word.audio.examples[index]}`" />
                        </div>

                        <div class="text-sm text-gray-400">
                            {{ example.jyutping }}
                        </div>

                        <div class="text-sm text-gray-600">
                            {{ example.meaning }}
                        </div>
                    </div>
                </li>
            </ul>
        </section>
    </main>

    <main v-else-if="notFound" class="max-w-2xl mx-auto px-4 py-12 space-y-10">

        <NuxtLink :to="`/topic/words/${topic}`" class="block text-gray-500 hover:underline">
            ← {{ topic.replace("-", " ") }}
        </NuxtLink>
        <!-- 404 -->
        <div class="max-w-xl mx-auto px-4 py-24 text-center text-gray-500">
            Word not found
        </div>
    </main>
</template>
