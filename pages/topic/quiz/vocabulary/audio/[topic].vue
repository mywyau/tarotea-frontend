<script setup lang="ts">

definePageMeta({
    middleware: ['topic-access'],
    ssr: true,
})


type Word = {
    id: string
    word: string
    jyutping: string
    meaning: string
}

type LevelData = {
    topic: number
    title: string
    description: string
    categories: Record<string, Word[]>
}


import { computed, ref } from 'vue'

import { generateAudioQuiz } from '@/utils/quiz/generateAudioQuiz'

import {
    playQuizCompleteFailSong,
    playQuizCompleteFanfareSong,
    playQuizCompleteOkaySong
} from '@/utils/sounds'

const route = useRoute()

const slug = computed(() => route.params.topic as string)

const { stop } = useGlobalAudio()

const { data, error } = await useFetch<LevelData>(
    () => `/api/topic/${slug.value}`,
    {
        key: () => `audio-quiz-${slug.value}`,
        server: true
    }
)

const wordsForLevel = computed<Word[]>(() => {
    if (!data.value) return []
    return Object.values(data.value.categories).flat()
})

const questions = computed(() =>
    wordsForLevel.value.length
        ? generateAudioQuiz(wordsForLevel.value)
        : []
)

const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

const current = ref(0)
const score = ref(0)
const answered = ref(false)
const selectedIndex = ref<number | null>(null)

const question = computed(() => questions.value[current.value])

const {
    state,
    authReady,
    isLoggedIn,
    user,
    entitlement,
    hasPaidAccess,
    isCanceling,
    currentPeriodEnd,
    resolve,
} = useMeStateV2();


function answer(index: number) {
    if (answered.value) return
    selectedIndex.value = index
    answered.value = true
    if (index === question.value.correctIndex) {
        score.value++
        playCorrectJingle() // ✅ here
    } else {
        playIncorrectJingle()
    }
}

function next() {
    stop() // 🔑 stop current word audio
    answered.value = false
    selectedIndex.value = null
    current.value++
}


const percentage = computed(() => {
    if (questions.value.length === 0) return 0
    return (score.value / questions.value.length) * 100
})

const completionSoundPlayed = ref(false)

const formattedTitle = computed(() => {
    return slug.value
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
})

watch(
    () => current.value,
    (newCurrent) => {
        if (
            newCurrent >= questions.value.length &&
            !completionSoundPlayed.value
        ) {
            completionSoundPlayed.value = true

            stop() // 🔑 stop last word audio

            setTimeout(() => {
                if (percentage.value >= 90) {
                    playQuizCompleteFanfareSong()
                } else if (percentage.value >= 50) {
                    playQuizCompleteOkaySong()
                } else {
                    playQuizCompleteFailSong()
                }
            }, 400)
        }
    }
)


</script>

<template>

    <main class="max-w-xl mx-auto px-4 py-16 space-y-8">

        <NuxtLink v-if="current < questions.length" :to="`/topics/quiz`" class="text-gray-500 hover:underline">
            ← Back to topic quizzes
        </NuxtLink>

        <section class="text-center space-y-4">

            <h1 class="text-2xl font-semibold text-center">
                {{ formattedTitle }} Audio Quiz
            </h1>

            <p v-if="(current + 1) <= questions.length" class="text-sm text-gray-500 text-center">
                Question {{ current + 1 }} / {{ questions.length }}
            </p>

            <div v-if="current < questions.length" class="space-y-6">

                <div v-if="question.type === 'audio'" class="text-center">
                    <AudioButton :key="question.audioKey" :src="`${cdnBase}/audio/${question.audioKey}`" autoplay />
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <button v-for="(option, i) in question.options" :key="i" class="aspect-square rounded-lg border flex items-center justify-center
           text-2xl font-medium text-center p-6 transition" :class="[
            !answered && 'hover:bg-gray-100',
            {
                'bg-green-100':
                    answered && i === question.correctIndex,
                'bg-red-100 animate-shake':
                    answered && i === selectedIndex && i !== question.correctIndex
            }
        ]" @click="answer(i)">
                        {{ option }}
                    </button>
                </div>

                <button v-if="answered" class="w-full mt-4 rounded bg-black text-white py-2" @click="next">
                    Next
                </button>

            </div>

            <div v-else class="text-center space-y-6">

                <h2 class="text-2xl font-semibold">
                    Quiz complete
                </h2>

                <p class="text-gray-600">
                    {{ score }} / {{ questions.length }}
                </p>

                <p class="text-gray-600">
                    You scored {{ score === questions.length
                        ? '100%'
                        : ((score / questions.length) * 100).toFixed(2) + '%' }}
                </p>

                <div class="pt-4 space-y-4">
                    <!-- <NuxtLink :to="`/topics/quiz/${slug}`" -->
                    <NuxtLink :to="`/topics/quiz`"
                        class="block w-full rounded bg-black text-white py-2 text-center font-medium hover:bg-gray-800 transition">
                        Restart Quiz
                    </NuxtLink>


                    <NuxtLink :to="`/topic/words/${slug}`" class="block text-gray-500 hover:underline">
                        ← Topic {{ slug }}
                    </NuxtLink>

                </div>
            </div>
        </section>

    </main>
</template>
