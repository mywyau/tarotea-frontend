<script setup lang="ts">

definePageMeta({
    // middleware: ['coming-soon'],
    ssr: false
})

import { useCountdownToUtcMidnight } from '@/composables/daily/useCountdownToUtcMidnight'
import { shuffleDailyWords, useDailySession } from '@/composables/daily/useDailySession'
import { useXpAnimation } from '@/composables/daily/useXpAnimation'
import { computed, onMounted, ref, watch } from 'vue'

import type { DailyWord } from '~/types/daily/DailyItem'


const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

const currentIndex = ref(0)
const selected = ref<string | null>(null)
const showResult = ref(false)

// const mergingXp = ref(false)
// const readyForNext = ref(false)
const showCompleteView = ref(false)
// let countdownInterval: any = null

const {
    xpDelta,
    mergingXp,
    readyForNext,
    triggerXp
} = useXpAnimation()

const { getAccessToken } = await useAuth()

const {
    loading,
    dailyCompleted,
    answeredCount,
    totalQuestions,
    correctCount,
    xpToday,
    questions,
    loadSession,
    completeSession
} = useDailySession()

const currentQuestion = computed(() =>
    questions.value.length
        ? questions.value[currentIndex.value]
        : null
)

const options = ref<DailyWord[]>([])

async function selectAnswer(answer: string) {

    if (!currentQuestion.value || showResult.value) return

    selected.value = answer
    showResult.value = true

    const correct = answer === currentQuestion.value.meaning

    try {
        const token = await getAccessToken()

        const res = await $fetch<{
            delta: number
            newXp: number
            newStreak: number
            dailyBlocked?: boolean,
            daily?: {
                answeredCount: number
                correctCount: number
                xpEarned: number
                totalQuestions: number
            }
        }>('/api/word-progress/update', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: {
                wordId: currentQuestion.value.id,
                correct,
                mode: 'daily'
            }
        })

        if (res.dailyBlocked) {
            return
        }

        if (res.daily) {
            answeredCount.value = res.daily.answeredCount
            correctCount.value = res.daily.correctCount
            xpToday.value = res.daily.xpEarned
            totalQuestions.value = res.daily.totalQuestions
        }

        currentXp.value = res.newXp
        currentStreak.value = res.newStreak

        const isLastQuestion =
            answeredCount.value >= totalQuestions.value

        triggerXp(res.delta, isLastQuestion)

        if (isLastQuestion && !dailyCompleted.value) {
            await completeSession(token)

            const COMPLETE_DELAY_MS = 1420

            setTimeout(() => {
                showCompleteView.value = true
            }, COMPLETE_DELAY_MS)
        }

    } catch (err) {
        console.error('XP update failed', err)
    }
}


function nextQuestion() {
    if (currentIndex.value < questions.value.length - 1) {
        currentIndex.value++
        selected.value = null
        showResult.value = false

        // 🔥 reset animation state
        readyForNext.value = false
        mergingXp.value = false
    }
}

const progressPercent = computed(() => {
    if (!totalQuestions.value) return 0
    return Math.round(
        (answeredCount.value / totalQuestions.value) * 100
    )
})

const currentXp = ref<number | null>(null)
const currentStreak = ref<number | null>(null)
const { timeRemaining } = useCountdownToUtcMidnight()


async function fetchOptions(correct: DailyWord) {
    const token = await getAccessToken()

    const res = await $fetch('/api/daily/distractors', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: {
            wordId: correct.id,
            limit: 3
        }
    })
    return shuffleDailyWords([correct, ...res.distractors])
}

onMounted(
    async () => {
        const token = await getAccessToken()
        await loadSession(token)
    }
)

watch(
    currentQuestion,
    async (q) => {
        if (!q) return
        options.value = await fetchOptions(q)
    },
    { immediate: true }
)

watch(
    () => currentQuestion.value?.id,
    async (wordId) => {
        if (!wordId) return

        try {
            const token = await getAccessToken()

            const progressMap = await $fetch<Record<string, { xp: number; streak: number }>>('/api/word-progress', {
                query: { wordIds: wordId },
                headers: {
                    Authorization: `Bearer ${token}`
                }
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

</script>


<template>
    <div class="max-w-xl mx-auto px-4 py-8">

        <h1 v-if="!dailyCompleted && currentQuestion" class="text-2xl font-semibold text-center mb-4">
            Daily Training
        </h1>

        <div v-if="loading" class="text-center py-10 text-gray-500">
            Loading daily training...
        </div>

        <div v-else>

            <div v-if="!dailyCompleted && currentQuestion" class="flex items-center gap-3 mb-6">

                <!-- Progress bar -->
                <div class="flex-1 bg-gray-200 rounded-full h-3">
                    <div class="bg-purple-400 h-3 rounded-full transition-all duration-300"
                        :style="{ width: progressPercent + '%' }" />
                </div>

                <span class="text-sm text-gray-500 whitespace-nowrap">
                    {{ answeredCount }} / {{ totalQuestions }}
                </span>

            </div>

            <div v-if="!dailyCompleted && currentQuestion" class="bg-white shadow p-6 rounded-xl">

                <p class="text-3xl font-medium text-center mb-2">
                    {{ currentQuestion.word }}
                </p>

                <div class="flex flex-col items-center gap-2 mb-6">

                    <!-- XP Bar -->
                    <div class="w-40 h-2 bg-gray-200 rounded">
                        <div :class="[
                            'h-2 bg-green-500 rounded transition-all duration-500',
                            mergingXp ? 'ring-2 ring-green-300' : ''
                        ]" :style="{ width: Math.min((currentXp ?? 0) / 1000 * 100, 100) + '%' }" />
                    </div>

                    <!-- XP Text + Delta -->
                    <div class="relative text-sm text-gray-500">
                        {{ currentXp ?? 0 }} XP

                        <transition name="xp-fall">
                            <span v-if="xpDelta !== null" :class="[
                                'absolute left-full ml-2 font-semibold transition-all duration-200',
                                xpDelta > 0 ? 'text-green-600' : 'text-red-600',
                                mergingXp ? 'opacity-0 scale-75 -translate-y-2' : ''
                            ]">
                                {{ xpDelta > 0 ? '+' + xpDelta : xpDelta }}
                            </span>
                        </transition>
                    </div>

                    <!-- Streak -->
                    <div class="h-5 flex items-center justify-center">
                        <span class="text-xs text-orange-500">
                            {{ currentStreak && currentStreak > 0 ? `${currentStreak} streak` : '' }}
                        </span>
                    </div>

                    <div class="text-center">
                        <AudioButton :key="currentQuestion.id" :src="`${cdnBase}/audio/${currentQuestion.id}.mp3`"
                            autoplay />
                    </div>
                </div>

                <div class="grid gap-3">
                    <button v-for="option in options" :key="option.id" @click="selectAnswer(option.meaning)"
                        class="p-3 rounded-lg border transition" :class="{
                            'bg-green-100 border-green-500':
                                showResult && option.meaning === currentQuestion.meaning,
                            'bg-red-100 border-red-500':
                                showResult &&
                                selected === option.meaning &&
                                option.meaning !== currentQuestion.meaning
                        }">
                        {{ option.meaning }}
                    </button>
                </div>


                <transition name="next-fade">
                    <button v-if="showResult && readyForNext && currentIndex < questions.length - 1"
                        @click="nextQuestion"
                        class="mt-6 w-full bg-black text-white p-3 rounded-lg transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]">
                        Next
                    </button>
                </transition>

            </div>

            <div v-else class="text-center bg-white p-6">
                <h2 class="text-xl font-semibold mb-4">
                    Daily Exercise Complete!
                </h2>

                <p class="mb-2">
                    Correct: {{ correctCount }} / {{ totalQuestions }}
                </p>

                <p class="mb-4">
                    XP Earned: {{ xpToday }} xp
                </p>

                <p class="text-purple-500 mb-2">
                    Next daily in: {{ timeRemaining }}
                </p>

                <NuxtLink to="/" class="text-gray-500">
                    Return back to home →
                </NuxtLink>
            </div>

        </div>
    </div>
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


.next-fade-enter-active {
    transition: opacity 0.18s ease-out, transform 0.18s ease-out;
}

.next-fade-leave-active {
    transition: opacity 0.15s ease-in, transform 0.15s ease-in;
}

.next-fade-enter-from {
    opacity: 0;
    transform: translateY(6px) scale(0.97);
}

.next-fade-enter-to {
    opacity: 1;
    transform: translateY(0px) scale(1);
}

.next-fade-leave-to {
    opacity: 0;
    transform: translateY(6px);
}
</style>
