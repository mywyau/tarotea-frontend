<script setup lang="ts">

// definePageMeta({
//     middleware: ['coming-soon']
// })

import type { TopicData } from '@/types/topic'
import { computed, ref, watch } from 'vue'

import {
    playCorrectJingle,
    playIncorrectJingle,
    playQuizCompleteFailSong,
    playQuizCompleteFanfareSong,
    playQuizCompleteOkaySong
} from '@/utils/sounds'
import { generateQuiz } from '~/utils/quiz/buildTopicQuiz'

const route = useRoute()
const topicSlug = computed(() => route.params.topic as string)

const { stop } = useGlobalAudio()

const { data, error } = await useFetch<TopicData>(
    () => `/api/index/topics/${topicSlug.value}`,
    {
        key: () => `topic-quiz-${topicSlug.value}`,
        server: true,
        credentials: 'include'
    }
)

const wordsForTopic = computed(() => {
    if (!data.value) return []
    return Object.values(data.value.categories).flat()
})

const questions = computed(() =>
    wordsForTopic.value.length
        ? generateQuiz(wordsForTopic.value)
        : []
)

const current = ref(0)
const score = ref(0)
const answered = ref(false)
const selectedIndex = ref<number | null>(null)

const question = computed(() => questions.value[current.value])

function answer(index: number) {
    if (answered.value) return
    selectedIndex.value = index
    answered.value = true

    if (index === question.value.correctIndex) {
        score.value++
        playCorrectJingle()
    } else {
        playIncorrectJingle()
    }
}

function next() {
    stop()
    answered.value = false
    selectedIndex.value = null
    current.value++
}

const percentage = computed(() => {
    if (!questions.value.length) return 0
    return (score.value / questions.value.length) * 100
})

const completionSoundPlayed = ref(false)

watch(
    () => current.value,
    (newCurrent) => {
        if (
            newCurrent >= questions.value.length &&
            !completionSoundPlayed.value
        ) {
            completionSoundPlayed.value = true
            stop()

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

            <p v-if="current < questions.length" class="text-sm text-gray-500">
                Question {{ current + 1 }} / {{ questions.length }}
            </p>

            <div v-if="current < questions.length" class="space-y-6">

                <!-- Show Cantonese word -->
                <div class="text-4xl font-medium">
                    {{ question.prompt }}
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <button v-for="(option, i) in question.options" :key="i" class="aspect-square rounded-lg border flex items-center justify-center
              text-2xl font-medium text-center p-4 transition" :class="[
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

            <div v-else class="space-y-6">

                <h2 class="text-2xl font-semibold">
                    Quiz Complete
                </h2>

                <p class="text-gray-600">
                    {{ score }} / {{ questions.length }}
                </p>

                <p class="text-gray-600">
                    {{ percentage.toFixed(0) }}%
                </p>

                <NuxtLink :to="`/topic/${topicSlug}/quiz`" class="block w-full rounded bg-black text-white py-2">
                    Restart Quiz
                </NuxtLink>

            </div>

        </section>

    </main>
</template>
