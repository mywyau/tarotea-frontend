<script setup lang="ts">

definePageMeta({
    middleware: ['coming-soon'],
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
const showCompleteView = ref(false)

const {
    xpDelta,
    mergingXp,
    readyForNext,
    triggerXp
} = useXpAnimation()

const { getAccessToken } = await useAuth()

const {
    loading,
    dailyLocked,
    requiredWords,
    currentWordCount,
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

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

const options = ref<DailyWord[]>([])

async function selectAnswer(answer: string) {

    if (!currentQuestion.value || showResult.value) return

    selected.value = answer
    showResult.value = true

    const correct: boolean = answer === currentQuestion.value.meaning

     // Update UI immediately
    if (correct) {
      playCorrectJingle()
    } else {
      playIncorrectJingle()
    }

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

            finishing.value = true

            await completeSession(token)

            await sleep(1800) // shorter feels better

            showCompleteView.value = true
            finishing.value = false
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
const finishing = ref(false)

const isQuizVisible = computed(
    () => !showCompleteView.value && !finishing.value
)

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

        if (dailyCompleted.value) {
            showCompleteView.value = true
        }
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

        <h1 v-if="!showCompleteView && !finishing && currentQuestion" class="text-2xl font-semibold text-center mb-4">
            Daily Training
        </h1>

        <div v-if="loading" class="text-center py-10 text-gray-500">
            Loading daily training...
        </div>

        <div v-else>

            <div v-if="dailyLocked" class="bg-white shadow p-8 rounded-xl text-center">

                <h2 class="text-xl font-semibold mb-4">
                    Daily Training Locked
                </h2>

                <p class="text-gray-600 mb-4">
                    You need to have quizzed yourself on at least {{ requiredWords }} words
                    to unlock Daily Training.
                </p>

                <div class="w-full bg-gray-200 h-3 rounded-full mb-4">
                    <div class="bg-purple-500 h-3 rounded-full transition-all duration-500"
                        :style="{ width: (currentWordCount / requiredWords) * 100 + '%' }" />
                </div>

                <p class="text-sm text-gray-500 mb-6">
                    {{ currentWordCount }} / {{ requiredWords }} words studied
                </p>

                <NuxtLink to="/topics/quiz"
                    class="mt-2 inline-block bg-white text-gray-600 font-semibold px-6 py-3 transition-transform duration-150 hover:scale-[1.05] active:scale-[0.98]">
                    Test your self on more words first →
                </NuxtLink>
            </div>

            <div class="relative min-h-[700px]">
                <div v-if="!showCompleteView && !finishing && currentQuestion" class="flex items-center gap-3 mb-6">

                    <div class="flex-1 bg-gray-200 rounded-full h-3 relative overflow-hidden">

                        <div :class="[
                            'h-3 rounded-full transition-all duration-500 relative',
                            progressPercent > 80
                                ? 'bg-purple-500 animate-pulse shadow-[0_0_20px_rgba(168,85,247,0.9)]'
                                : 'bg-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.6)]'
                        ]" :style="{ width: progressPercent + '%' }">

                            <!-- animated shimmer -->
                            <div class="absolute inset-0 shimmer-layer"></div>

                        </div>

                    </div>

                    <span class="text-sm text-gray-500 whitespace-nowrap">
                        {{ answeredCount }} / {{ totalQuestions }}
                    </span>

                </div>

                <div v-if="!showCompleteView && !finishing && currentQuestion" class="bg-white shadow p-6 rounded-xl">

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

                <transition name="finalise-fade">
                    <div v-if="finishing"
                        class="absolute inset-0 flex flex-col items-center justify-center text-center bg-white">
                        <div class="loader mb-6"></div>

                        <p class="text-lg font-semibold text-purple-600">
                            Finalising your score...
                        </p>

                        <p class="text-sm text-gray-500 mt-2">
                            Calculating XP & streak
                        </p>
                    </div>
                </transition>

                <transition name="complete-fade">
                    <div v-if="showCompleteView"
                        class="absolute inset-0 overflow-hidden rounded-2xl p-8 text-center text-black bg-white">

                        <!-- Subtle Glow Background -->
                        <div
                            class="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_white,_transparent_60%)] pointer-events-none">
                        </div>


                        <h2 class="text-2xl font-bold mb-2 tracking-wide">
                            Daily Exercise Complete!
                        </h2>

                        <!-- Accuracy Card -->
                        <div class="mt-4 bg-white/10 backdrop-blur-sm rounded-xl p-5">
                            <p class="text-sm uppercase tracking-wider opacity-80 mb-2">
                                Accuracy
                            </p>
                            <p class="text-3xl font-semibold">
                                {{ totalQuestions
                                    ? Math.round((correctCount / totalQuestions) * 100)
                                    : 0
                                }} %
                            </p>
                        </div>

                        <div class="mt-4 bg-white/10 backdrop-blur-sm rounded-xl p-5">
                            <p class="text-sm uppercase tracking-wider opacity-80 mb-2">
                                Score
                            </p>
                            <p class="text-3xl font-semibold">
                                {{ correctCount }} / {{ totalQuestions }}
                            </p>
                        </div>

                        <!-- XP Card -->
                        <div class="mt-4 bg-white/10 backdrop-blur-sm rounded-xl p-5">
                            <p class="text-sm uppercase tracking-wider opacity-80 mb-2">
                                XP Earned
                            </p>
                            <p class="text-4xl font-bold text-green-500">
                                +{{ xpToday }}
                            </p>
                        </div>

                        <!-- Countdown -->
                        <div class="mt-8 text-sm opacity-90">
                            <p class="uppercase tracking-wide text-xs opacity-70 mb-1">
                                Next daily unlocks in
                            </p>
                            <p class="text-lg font-semibold text-purple-400">
                                {{ timeRemaining }}
                            </p>
                        </div>

                        <!-- CTA Button -->
                        <NuxtLink to="/"
                            class="mt-8 inline-block bg-white text-gray-600 font-semibold px-6 py-3 transition-transform duration-150 hover:scale-[1.05] active:scale-[0.98]">
                            Return Home →
                        </NuxtLink>

                    </div>
                </transition>
            </div>
        </div>
    </div>
</template>


<style scoped>
.finalise-fade-enter-active,
.finalise-fade-leave-active {
    transition: opacity 0.5s ease, transform 0.5s ease;
}

.finalise-fade-enter-from,
.finalise-fade-leave-to {
    opacity: 0;
    transform: translateY(10px) scale(0.97);
}

.complete-fade-enter-active {
    transition: opacity 0.7s cubic-bezier(.22, 1, .36, 1),
        transform 0.7s cubic-bezier(.22, 1, .36, 1);
}

.complete-fade-enter-from {
    opacity: 0;
    transform: translateY(12px);
}

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

/* subtle animated shimmer */
.shimmer-layer {
    background: linear-gradient(110deg,
            transparent 25%,
            rgba(255, 255, 255, 0.5) 50%,
            transparent 75%);
    background-size: 200% 100%;
    animation: shimmer 2.5s infinite linear;
    mix-blend-mode: overlay;
}

@keyframes shimmer {
    0% {
        background-position: -200% 0;
    }

    100% {
        background-position: 200% 0;
    }
}

/* optional subtle breathing pulse */
@keyframes progressPulse {
    0% {
        box-shadow: 0 0 8px rgba(168, 85, 247, 0.4);
    }

    50% {
        box-shadow: 0 0 18px rgba(168, 85, 247, 0.8);
    }

    100% {
        box-shadow: 0 0 8px rgba(168, 85, 247, 0.4);
    }
}

.loader {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 3px solid rgba(168, 85, 247, 0.2);
    border-top: 3px solid rgb(168, 85, 247);
    animation: spin 0.9s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
