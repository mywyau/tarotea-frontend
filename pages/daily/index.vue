<script setup lang="ts">

definePageMeta({
    //   middleware: ['coming-soon'],
    ssr: false
})

import { computed, onMounted, ref } from 'vue'

type DailyItem = {
    id: string
    word: string
    meaning: string
}

const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

const questions = ref<DailyItem[]>([])
const loading = ref(true)

const currentIndex = ref(0)
const selected = ref<string | null>(null)
const showResult = ref(false)

const xpToday = ref(0)
const correctCount = ref(0)

const { getAccessToken } = await useAuth()


const dailyCompleted = ref(false)

onMounted(async () => {
    try {
        const token = await getAccessToken()

        const dailyData = await $fetch<{
            completed: boolean
            xpEarnedToday: number
            correctCount: number
            totalQuestions: number
            words: DailyItem[]
        }>('/api/daily', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        dailyCompleted.value = dailyData.completed
        xpToday.value = dailyData.xpEarnedToday

        if (dailyData.completed) {
            // restore completed session data
            correctCount.value = dailyData.correctCount
            questions.value = new Array(dailyData.totalQuestions).fill(null)
        } else {
            // start fresh daily session
            questions.value = shuffle(dailyData.words)
        }

    } catch (err) {
        console.error('Daily fetch failed', err)
        questions.value = []
    } finally {
        loading.value = false
    }
})


function shuffle<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5)
}

function generateOptions(correct: DailyItem, pool: DailyItem[]) {
    const distractors = shuffle(pool.filter(w => w.id !== correct.id)).slice(0, 3)
    return shuffle([correct, ...distractors])
}

const currentQuestion = computed(() =>
    questions.value.length
        ? questions.value[currentIndex.value]
        : null
)

const options = computed(() =>
    currentQuestion.value
        ? generateOptions(currentQuestion.value, questions.value)
        : []
)

async function selectAnswer(answer: string) {
    if (!currentQuestion.value || showResult.value) return

    selected.value = answer
    showResult.value = true

    const correct = answer === currentQuestion.value.meaning

    if (correct) {
        correctCount.value++
    }

    try {
        const token = await getAccessToken()

        const res = await $fetch<{
            delta: number
            newXp: number
            newStreak: number
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

        console.log('', currentQuestion.value.id)

        // 🔥 Animate XP
        xpDelta.value = res.delta

        // update UI immediately
        currentXp.value = res.newXp
        currentStreak.value = res.newStreak
        xpToday.value += res.delta

        setTimeout(() => {
            xpDelta.value = null
        }, 800)

    } catch (err) {
        console.error('XP update failed', err)
    }
}


function nextQuestion() {
    if (currentIndex.value < questions.value.length - 1) {
        currentIndex.value++
        selected.value = null
        showResult.value = false
    }
}

const progressPercent = computed(() => {
    if (!questions.value.length) return 0

    const answered =
        showResult.value
            ? currentIndex.value + 1
            : currentIndex.value

    return Math.round((answered / questions.value.length) * 100)
})

const justCompleted = ref(false)
const xpDelta = ref<number | null>(null)
const currentXp = ref<number | null>(null)
const currentStreak = ref<number | null>(null)


const timeRemaining = ref('')

function updateCountdown() {
    const now = new Date()

    // next UTC midnight
    const nextMidnight = new Date(
        Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + 1,
            0, 0, 0
        )
    )

    const diff = nextMidnight.getTime() - now.getTime()

    if (diff <= 0) {
        timeRemaining.value = '00:00:00'
        return
    }

    const totalSeconds = Math.floor(diff / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const hh = String(hours).padStart(2, '0')
    const mm = String(minutes).padStart(2, '0')
    const ss = String(seconds).padStart(2, '0')

    timeRemaining.value = `${hh}:${mm}:${ss}`
}

let countdownInterval: any = null

onMounted(() => {
    updateCountdown()
    countdownInterval = setInterval(updateCountdown, 1000) // every 1 second
})

onUnmounted(() => {
    if (countdownInterval) clearInterval(countdownInterval)
})


import { watch } from 'vue'

watch(
    () => currentQuestion.value?.id,
    async (wordId) => {
        if (!wordId) return

        try {
            const token = await getAccessToken()

            const progressMap = await $fetch<
                Record<string, { xp: number; streak: number }>
            >('/api/word-progress', {
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

watch(
    () => ({
        index: currentIndex.value,
        show: showResult.value,
        total: questions.value.length
    }),
    async ({ index, show, total }) => {
        if (!show) return
        if (index !== total - 1) return
        if (dailyCompleted.value) return

        try {
            const token = await getAccessToken()

            await $fetch('/api/daily/complete', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: {
                    xpEarned: xpToday.value,
                    correctCount: correctCount.value,
                    totalQuestions: questions.value.length
                }
            })

            dailyCompleted.value = true
            justCompleted.value = true

        } catch (err) {
            console.error('Daily complete failed', err)
        }
    }
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

                <!-- Counter -->
                <span v-if="(currentIndex + 1) <= questions.length" class="text-sm text-gray-500 whitespace-nowrap">
                    {{ currentIndex + 1 }} / {{ questions.length }}
                </span>

            </div>

            <div v-if="!dailyCompleted && currentQuestion" class="bg-white shadow p-6 rounded-xl">

                <p class="text-3xl font-medium text-center mb-2">
                    {{ currentQuestion.word }}
                </p>

                <div class="flex flex-col items-center gap-2 mb-6">

                    <!-- XP Bar -->
                    <div class="w-40 h-2 bg-gray-200 rounded">
                        <div class="h-2 bg-green-500 rounded transition-all duration-500"
                            :style="{ width: Math.min((currentXp ?? 0) / 1000 * 100, 100) + '%' }" />
                    </div>

                    <!-- XP Text + Delta -->
                    <div class="relative text-sm text-gray-500">
                        {{ currentXp ?? 0 }} XP

                        <transition name="xp-fall">
                            <span v-if="xpDelta !== null" class="absolute left-full ml-2 font-semibold"
                                :class="xpDelta > 0 ? 'text-green-600' : 'text-red-600'">
                                {{ xpDelta > 0 ? '+' + xpDelta : xpDelta }}
                            </span>
                        </transition>
                    </div>

                    <!-- Streak -->
                    <div class="h-5 flex items-center justify-center">
                        <span class="text-xs text-orange-500">
                            {{ currentStreak && currentStreak > 0 ? `🔥 ${currentStreak} streak` : '' }}
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


                <button v-if="showResult && currentIndex < questions.length - 1" @click="nextQuestion"
                    class="mt-6 w-full bg-black text-white p-3 rounded-lg">
                    Next
                </button>

            </div>

            <div v-else class="text-center bg-white p-6">
                <h2 class="text-xl font-semibold mb-4">
                    Daily Complete!
                </h2>

                <p class="mb-2">
                    Correct: {{ correctCount }} / {{ questions.length }}
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
</style>
