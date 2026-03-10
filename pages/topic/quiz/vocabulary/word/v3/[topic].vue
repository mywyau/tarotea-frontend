<script setup lang="ts">

definePageMeta({
    middleware: ['topic-access-quiz'],
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
import { masteryXp } from '~/utils/xp/helpers'

const route = useRoute()
const topicSlug = computed(() => route.params.topic as string)

const { getAccessToken } = await useAuth()

type QuizAnswer = { wordId: string; correct: boolean }

const answerLog = ref<QuizAnswer[]>([])
const finishing = ref(false)

const wordProgressMap = ref<
    Record<string, { xp: number; streak: number }>
>({})

const STREAK_CAP = 5
const WRONG_PENALTY = -12

function deltaFor(correct: boolean, streakBefore: number) {
    if (!correct) return WRONG_PENALTY
    return 5 + Math.min(streakBefore, STREAK_CAP) * 2
}

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

const current = ref(0)
const score = ref(0)
const answered = ref(false)
const selectedIndex = ref<number | null>(null)
const showResult = ref<boolean>(false)

const question = computed(() => questions.value[current.value])

const BRAND_COLORS = [
    '#EAB8E4',
    '#A8CAE0',
    '#F4C2D7',
    '#F2CACA',
    '#D6A3D1',
    'rgba(244,205,39,0.35)',
]

const tileColors = ref<string[]>([])

function generateTileColors() {
    tileColors.value = shuffleFisherYates(BRAND_COLORS).slice(0, 4)
}

async function answer(index: number) {
    if (answered.value) return
    if (!question.value) return

    selectedIndex.value = index
    answered.value = true

    const correct = index === question.value.correctIndex

    // 🔥 Store answer for batch persistence
    answerLog.value.push({
        wordId: question.value.wordId,
        correct
    })

    if (correct) {
        score.value++
        playCorrectJingle()
    } else {
        playIncorrectJingle()
    }

    const wordId = question.value.wordId
    const prev = wordProgressMap.value[wordId] ?? { xp: 0, streak: 0 }

    const delta = deltaFor(correct, prev.streak)
    const newStreak = correct ? prev.streak + 1 : 0
    const newXp = Math.max(0, prev.xp + delta)

    wordProgressMap.value[wordId] = {
        xp: newXp,
        streak: newStreak
    }

    xpDelta.value = delta
    currentXp.value = newXp
    currentStreak.value = newStreak

    setTimeout(() => {
        xpDelta.value = null
    }, 1000)
}

async function finalizeTopicQuiz() {
    if (finishing.value) return
    finishing.value = true

    try {
        const token = await getAccessToken()

        await $fetch('/api/quiz/grind/finalize', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: {
                topic: topicSlug.value,
                answers: answerLog.value
            }
        })

    } catch (err) {
        console.error('Finalize topic quiz failed', err)
    } finally {
        finishing.value = false
    }
}

async function next() {
    stop()
    answered.value = false
    selectedIndex.value = null

    current.value++

    if (current.value >= questions.value.length) {
        if (answerLog.value.length > 0) {
            await finalizeTopicQuiz()
        }
        return
    }

    const nextWordId = questions.value[current.value]?.wordId

    if (nextWordId) {
        currentStreak.value =
            wordProgressMap.value[nextWordId]?.streak ?? 0

        currentXp.value =
            wordProgressMap.value[nextWordId]?.xp ?? 0
    }
}

const percentage = computed(() => {
    if (!questions.value.length) return 0
    return (score.value / questions.value.length) * 100
})

const completionSoundPlayed = ref(false)

const weakestIds = ref<string[]>([])

const weightedWords = computed(() => {
    const words = wordsForTopic.value
    if (!words.length) return []

    const totalQuestions = 20

    if (!weakestIds.value.length) {
        return shuffleFisherYates(words).slice(0, totalQuestions)
    }

    const weakestPool = shuffleFisherYates(
        words.filter(w => weakestIds.value.includes(w.id))
    )

    const nonWeakestPool = shuffleFisherYates(
        words.filter(w => !weakestIds.value.includes(w.id))
    )

    const weakestTarget = Math.floor(totalQuestions * 0.7)

    const selected: typeof words = []

    selected.push(...weakestPool.slice(0, weakestTarget))
    selected.push(
        ...nonWeakestPool.slice(0, totalQuestions - selected.length)
    )

    if (selected.length < totalQuestions) {
        const remaining = shuffleFisherYates(
            words.filter(w => !selected.some(s => s.id === w.id))
        )

        selected.push(
            ...remaining.slice(0, totalQuestions - selected.length)
        )
    }

    return shuffleFisherYates(selected)
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

const progressPercent = computed(() => {
    const answered =
        showResult.value
            ? current.value + 1
            : current.value

    return Math.round((answered / questions.value.length) * 100)
})

watch(
    () => questions.value,
    async (qs) => {
        if (!qs.length) return

        const token = await getAccessToken()
        const wordIds = qs.map(q => q.wordId)

        const progressMap = await $fetch<
            Record<string, { xp: number; streak: number }>
        >('/api/word-progress', {
            query: { wordIds: wordIds.join(',') },
            headers: { Authorization: `Bearer ${token}` }
        })

        wordProgressMap.value = progressMap

        const firstId = qs[0]?.wordId
        currentStreak.value = progressMap[firstId]?.streak ?? 0
        currentXp.value = progressMap[firstId]?.xp ?? 0
    },
    { immediate: true }
)

watch(weakestIds, () => {
    current.value = 0
    score.value = 0
    answerLog.value = []
    completionSoundPlayed.value = false
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

watch(
    () => question.value?.wordId,
    () => {
        generateTileColors()
    },
    { immediate: true }
)
</script>

<template>
    <main class="max-w-xl mx-auto px-4 py-16 space-y-8">

        <NuxtLink v-if="current < questions.length" :to="`/topics/quiz`" class="text-black text-sm hover:underline">
            ← Back to topic quizzes
        </NuxtLink>

        <section class="text-center space-y-4">

            <h1 class="text-2xl font-semibold capitalize">
                {{ topicSlug.replace('-', ' ') }}
            </h1>

            <!-- Progress -->
            <div class="flex items-center gap-3 mb-6">

                <div class="flex-1 bg-gray-200 rounded-full h-3">
                    <div class="bg-purple-300 h-3 rounded-full transition-all duration-300"
                        :style="{ width: progressPercent + '%' }" />
                </div>

                <span v-if="(current + 1) <= questions.length" class="text-sm text-gray-500 whitespace-nowrap">
                    {{ current + 1 }} / {{ questions.length }}
                </span>

            </div>

            <!-- Active Question -->
            <div v-if="current < questions.length" class="space-y-6">

                <!-- Prompt -->
                <p class="text-4xl font-semibold min-h-[64px] flex items-center justify-center">
                    {{ question.prompt }}
                </p>

                <!-- XP + Streak -->
                <div class="min-h-[50px] space-y-3">

                    <div class="flex items-center justify-center gap-3">

                        <div class="w-32 h-1 bg-gray-200 rounded">
                            <div class="h-1 bg-green-500 rounded transition-all duration-500"
                                :style="{ width: Math.min((currentXp ?? 0) / 1000 * 100, 100) + '%' }" />
                        </div>

                        <div class="relative flex items-center">
                            <span class="text-sm text-gray-500 whitespace-nowrap">
                                {{ currentXp ?? 0 }} / {{ masteryXp }} XP
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

                    <div class="h-5 flex items-center justify-center">
                        <span v-if="currentStreak && currentStreak > 0" class="text-xs text-orange-500">
                            {{ currentStreak }} streak
                        </span>
                    </div>

                </div>

                <!-- Answer Tiles -->
                <div class="grid grid-cols-2 gap-4">

                    <button v-for="(option, i) in question.options" :key="i" class="aspect-square rounded-xl flex items-center justify-center
                   text-xl font-semibold text-center p-6
                   transition-all duration-300 ease-out
                   shadow-sm active:scale-95 hover:brightness-110" :style="{
                    backgroundColor:
                        !answered
                            ? tileColors[i]
                            : i === question.correctIndex
                                ? '#BBF7D0'
                                : i === selectedIndex
                                    ? '#FECACA'
                                    : tileColors[i]
                }" :class="[
                    answered && i === question.correctIndex && 'ring-2 ring-emerald-400',
                    answered && i === selectedIndex && i !== question.correctIndex && 'animate-shake ring-2 ring-rose-400'
                ]" @click="answer(i)">
                        {{ option }}
                    </button>

                </div>

                <div class="h-10">
                    <button v-if="answered" class="w-full rounded bg-black text-white py-2 transition hover:bg-gray-800"
                        @click="next">
                        Next
                    </button>
                </div>

            </div>

            <!-- Completion Screen -->
            <div v-else class="text-center space-y-6">

                <h2 class="text-2xl font-semibold">
                    Quiz Complete
                </h2>

                <p class="text-gray-600">
                    {{ score }} / {{ questions.length }}
                </p>

                <p class="text-gray-600">
                    {{ percentage.toFixed(0) }}%
                </p>

                <div class="pt-4 space-y-4">

                    <NuxtLink :to="`/topics/quiz`"
                        class="block w-full rounded bg-black text-white py-2 text-center font-medium hover:bg-gray-800 transition">
                        Restart Quiz
                    </NuxtLink>

                    <NuxtLink :to="`/topic/words/${topicSlug}`" class="block text-black hover:underline">
                        ← Back to topic
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
