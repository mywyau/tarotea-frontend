<script setup lang="ts">

// definePageMeta({
//     middleware: ['coming-soon']
// })

definePageMeta({
    middleware: ['topic-access'],
    ssr: true,
})


import type { TopicData } from '@/types/topic'
import { computed, ref, watch } from 'vue'

import {
    playCorrectJingle,
    playIncorrectJingle,
    playQuizCompleteFailSong,
    playQuizCompleteFanfareSong,
    playQuizCompleteOkaySong
} from '@/utils/sounds'

import { buildTopicQuiz } from '~/utils/quiz/buildTopicQuiz'

const route = useRoute()
const topicSlug = computed(() => route.params.topic as string)

const { getAccessToken } = await useAuth()

const xpDelta = ref<number | null>(null)
const currentXp = ref<number | null>(null)
const currentStreak = ref<number | null>(null)

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

// const questions = computed(() =>
//     wordsForTopic.value.length
//         ? buildTopicQuiz(wordsForTopic.value)
//         : []
// )

const current = ref(0)
const score = ref(0)
const answered = ref(false)
const selectedIndex = ref<number | null>(null)

const question = computed(() => questions.value[current.value])

// function answer(index: number) {
//     if (answered.value) return
//     selectedIndex.value = index
//     answered.value = true

//     if (index === question.value.correctIndex) {
//         score.value++
//         playCorrectJingle()
//     } else {
//         playIncorrectJingle()
//     }
// }

async function answer(index: number) {
    if (answered.value) return
    if (!question.value) return

    selectedIndex.value = index
    answered.value = true

    const correct = index === question.value.correctIndex

    if (correct) {
        score.value++
        playCorrectJingle()
    } else {
        playIncorrectJingle()
    }

    try {
        const token = await getAccessToken()

        const res = await $fetch<{
            success: boolean
            delta: number
            newXp: number
            newStreak: number
        }>('/api/word-progress/update', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: {
                wordId: question.value.wordId,
                correct
            }
        })

        xpDelta.value = res.delta
        currentXp.value = res.newXp
        currentStreak.value = res.newStreak

        setTimeout(() => {
            xpDelta.value = null
        }, 1000)

    } catch (err) {
        console.error('XP update failed', err)
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

const weakestIds = ref<string[]>([])

function shuffle<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5)
}

const weightedWords = computed(() => {
    const words = wordsForTopic.value
    if (!words.length) return []

    const totalQuestions = 20

    if (!weakestIds.value.length) {
        return shuffle(words).slice(0, totalQuestions)
    }

    const weakestPool = shuffle(
        words.filter(w => weakestIds.value.includes(w.id))
    )

    const nonWeakestPool = shuffle(
        words.filter(w => !weakestIds.value.includes(w.id))
    )

    const weakestTarget = Math.floor(totalQuestions * 0.7)

    const selected: typeof words = []

    selected.push(...weakestPool.slice(0, weakestTarget))
    selected.push(
        ...nonWeakestPool.slice(0, totalQuestions - selected.length)
    )

    if (selected.length < totalQuestions) {
        const remaining = shuffle(
            words.filter(w => !selected.some(s => s.id === w.id))
        )

        selected.push(
            ...remaining.slice(0, totalQuestions - selected.length)
        )
    }

    return shuffle(selected)
})

const questions = computed(() =>
    weightedWords.value.length
        ? buildTopicQuiz(weightedWords.value)
        : []
)


onMounted(async () => {
    try {
        const token = await getAccessToken()

        const weakest = await $fetch<{ id: string }[]>(
            '/api/word-progress/weakest',
            {
                query: { topic: topicSlug.value },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        )

        weakestIds.value = weakest.map(w => w.id)

        console.log("🧠 Weakest topic words:", weakestIds.value)

    } catch {
        weakestIds.value = []
    }
})


// onMounted(() => {
//     watch(
//         () => question.value?.wordId,
//         async (wordId) => {
//             if (!wordId) return

//             try {
//                 const token = await getAccessToken()

//                 const progressMap = await $fetch<
//                     Record<string, { xp: number; streak: number }>
//                 >(
//                     '/api/word-progress',
//                     {
//                         query: { wordIds: wordId },
//                         headers: { Authorization: `Bearer ${token}` }
//                     }
//                 )



//                 currentXp.value = progressMap[wordId]?.xp ?? 0
//                 currentStreak.value = progressMap[wordId]?.streak ?? 0

//                 console.log(currentXp.value)
//                 console.log(currentStreak.value)
//             } catch {
//                 currentXp.value = 0
//                 currentStreak.value = 0
//             }
//         },
//         { immediate: true }
//     )
// })

watch(
    () => question.value?.wordId,
    async (wordId) => {
        if (!wordId) return

        try {
            const token = await getAccessToken()

            const progressMap = await $fetch<
                Record<string, { xp: number; streak: number }>
            >(
                '/api/word-progress',
                {
                    query: { wordIds: wordId },
                    headers: { Authorization: `Bearer ${token}` }
                }
            )

            currentXp.value = progressMap[wordId]?.xp ?? 0
            currentStreak.value = progressMap[wordId]?.streak ?? 0

        } catch {
            currentXp.value = 0
            currentStreak.value = 0
        }
    },
    { immediate: true }
)

watch(weakestIds, () => {
    current.value = 0
    score.value = 0
})

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
                <div class="text-center">

                    <p class="text-4xl mb-3 min-h-[64px] flex items-center justify-center text-center">
                        {{ question.prompt }}
                    </p>

                    <!-- Progress Block (fixed height) -->
                    <div class="min-h-[110px] space-y-3">
                        <!-- XP -->
                        <div class="text-sm text-gray-500 h-5 flex items-center justify-center">
                            <span>
                                {{ currentXp ?? 0 }} XP
                            </span>
                        </div>

                        <!-- XP Bar -->
                        <div class="w-32 mx-auto h-1 bg-gray-200 rounded">
                            <div class="h-1 bg-green-500 rounded transition-all duration-500"
                                :style="{ width: Math.min((currentXp ?? 0) / 1000 * 100, 100) + '%' }" />
                        </div>

                        <!-- Streak -->
                        <div class="h-5 flex items-center justify-center">
                            <span class="text-xs text-orange-500">
                                {{ currentStreak && currentStreak > 0 ? `🔥 ${currentStreak} streak` : '' }}
                            </span>
                        </div>
                    </div>

                    <!-- XP delta reserved space -->
                    <div class="h-10 relative flex items-center justify-center">
                        <transition name="xp-fall">
                            <div v-if="xpDelta !== null" class="absolute text-xl font-semibold pointer-events-none"
                                :class="xpDelta > 0 ? 'text-green-600' : 'text-red-600'">
                                {{ xpDelta > 0 ? '+' + xpDelta : xpDelta }} XP
                            </div>
                        </transition>
                    </div>

                </div>

                <div class="grid grid-cols-2 gap-4">
                    <button v-for="(option, i) in question.options" :key="i"
                        class="aspect-square rounded-lg border flex items-center justify-center font-medium text-center p-4 text-lg sm:text-xl md:text-2xl break-words leading-tight"
                        :class="[
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

                <div class="h-12">
                    <button v-if="answered" class="w-full rounded bg-black text-white py-2" @click="next">
                        Next
                    </button>
                </div>

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

                <NuxtLink :to="`/topics/quiz`" class="block w-full rounded bg-black text-white py-2">
                    Restart Quiz
                </NuxtLink>

                <NuxtLink :to="`/topic/words/${topicSlug}`" class="block text-gray-500 hover:underline">
                    ← Topic {{ topicSlug }}
                </NuxtLink>
            </div>

        </section>

    </main>
</template>

<style scoped>
.xp-fall-enter-active {
    transition: transform 0.45s ease-out, opacity 0.45s ease-out;
}

.xp-fall-leave-active {
    transition: transform 0.35s ease-in, opacity 0.35s ease-in;
}

.xp-fall-enter-from {
    opacity: 0;
    transform: translateY(-10px) scale(0.9);
}

.xp-fall-enter-to {
    opacity: 1;
    transform: translateY(0px) scale(0.95);
}

.xp-fall-leave-to {
    opacity: 0;
    transform: translateY(12px) scale(0.9);
}

.fade-streak-enter-active,
.fade-streak-leave-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-streak-enter-from,
.fade-streak-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}
</style>
