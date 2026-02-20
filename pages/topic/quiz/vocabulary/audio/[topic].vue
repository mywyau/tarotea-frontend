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

const { getAccessToken } = await useAuth()

const currentXp = ref<number | null>(null)
const currentStreak = ref<number | null>(null)
const xpDelta = ref<number | null>(null)
const showResult = ref<boolean>(false)

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


// async function answer(index: number) {
//     if (answered.value) return
//     if (!question.value) return

//     selectedIndex.value = index
//     answered.value = true

//     const correct = index === question.value.correctIndex

//     if (correct) {
//         score.value++
//         playCorrectJingle()
//     } else {
//         playIncorrectJingle()
//     }

//     if (!isLoggedIn.value) return

//     try {
//         const token = await getAccessToken()

//         const res = await $fetch<{
//             success: boolean
//             delta: number
//             newXp: number
//             newStreak: number
//         }>('/api/word-progress/update', {
//             method: 'POST',
//             headers: {
//                 Authorization: `Bearer ${token}`,
//             },
//             body: {
//                 wordId: question.value.wordId,
//                 correct
//             }
//         })

//         xpDelta.value = res.delta
//         currentXp.value = res.newXp
//         currentStreak.value = res.newStreak

//         setTimeout(() => {
//             xpDelta.value = null
//         }, 1000)

//     } catch (err) {
//         console.error('XP update failed', err)
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

    if (!isLoggedIn.value) return

    try {
        const token = await getAccessToken()

        const res = await $fetch<{
            delta: number
            optimisticXp: number
            optimisticStreak: number
            dailyBlocked?: boolean
            daily?: {
                answeredCount: number
                correctCount: number
                xpEarned: number
                totalQuestions: number
            } | null
        }>('/api/word-progress/update.v2', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: {
                wordId: question.value.wordId,
                correct,
                mode: 'normal' // topic audio quiz = normal mode
            }
        })

        xpDelta.value = res.delta
        currentXp.value = res.optimisticXp
        currentStreak.value = res.optimisticStreak

        setTimeout(() => {
            xpDelta.value = null
        }, 1000)

    } catch (err) {
        console.error('XP update failed', err)
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

const progressPercent = computed(() => {
    const answered =
        showResult.value
            ? current.value + 1
            : current.value

    return Math.round((answered / questions.value.length) * 100)
})

watch(
    () => question.value?.wordId,
    async (wordId) => {
        if (!wordId || !isLoggedIn.value) return

        try {
            const token = await getAccessToken()

            const progressMap = await $fetch<
                Record<string, { xp: number; streak: number }>
            >('/api/word-progress', {
                query: { wordIds: wordId },
                headers: { Authorization: `Bearer ${token}` }
            })

            currentXp.value = progressMap[wordId]?.xp ?? 0
            currentStreak.value = progressMap[wordId]?.streak ?? 0
        } catch {
            currentXp.value = 0
            currentStreak.value = 0
        }
    },
    { immediate: true }
)

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

            <div class="flex items-center gap-3 mb-6">

                <div class="flex-1 bg-gray-200 rounded-full h-3">
                    <div class="bg-purple-300 h-3 rounded-full transition-all duration-300"
                        :style="{ width: progressPercent + '%' }" />
                </div>

                <span v-if="(current + 1) <= questions.length" class="text-sm text-gray-500 whitespace-nowrap">
                    {{ current + 1 }} / {{ questions.length }}
                </span>

            </div>

            <div v-if="current < questions.length" class="space-y-6">

                <div v-if="question.type === 'audio'" class="text-center">
                    <AudioButton :key="question.audioKey" :src="`${cdnBase}/audio/${question.audioKey}`" autoplay />
                </div>

                <div class="min-h-[50px] space-y-3">

                    <!-- XP Row -->
                    <div class="flex items-center justify-center gap-3">

                        <!-- XP Bar -->
                        <div class="w-32 h-1 bg-gray-200 rounded">
                            <div class="h-1 bg-green-500 rounded transition-all duration-500"
                                :style="{ width: Math.min((currentXp ?? 0) / 1000 * 100, 100) + '%' }" />
                        </div>

                        <!-- XP Text + Delta Anchor -->
                        <div class="relative flex items-center">

                            <span class="text-sm text-gray-500 whitespace-nowrap">
                                {{ currentXp ?? 0 }} XP
                            </span>

                            <transition name="xp-fall">
                                <span v-if="xpDelta !== null"
                                    class="absolute left-full ml-2 text-sm font-semibold pointer-events-none"
                                    :class="xpDelta > 0 ? 'text-green-600' : 'text-red-600'">
                                    {{ xpDelta > 0 ? '+' + xpDelta : xpDelta }}
                                </span>
                            </transition>

                        </div>

                    </div>

                    <!-- Streak -->
                    <div class="h-5 flex items-center justify-center">
                        <span v-if="currentStreak && currentStreak > 0" class="text-xs text-orange-500">
                            {{ currentStreak }} streak
                        </span>
                    </div>

                </div>

                <div class="grid grid-cols-2 gap-4">
                    <button v-for="(option, i) in question.options" :key="i"
                        class="aspect-square rounded-lg border flex items-center justify-center text-xl font-medium text-center p-6 transition break-words leading-tight"
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
