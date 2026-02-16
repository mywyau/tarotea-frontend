<script setup lang="ts">
import { computed, ref } from 'vue'

type DailyItem = {
    id: string
    cantonese: string
    meaning: string
}

function mockWeakWords(): DailyItem[] {
    return [
        { id: '1', cantonese: '外套', meaning: 'outerwear' },
        { id: '2', cantonese: '牛仔褲', meaning: 'jeans' },
        { id: '3', cantonese: '裙', meaning: 'skirt' },
        { id: '4', cantonese: '波鞋', meaning: 'trainers' },
        { id: '5', cantonese: '風褸', meaning: 'light jacket' },
        { id: '6', cantonese: '帽', meaning: 'hat' },
        { id: '7', cantonese: '手套', meaning: 'gloves' },
        { id: '8', cantonese: '拖鞋', meaning: 'slippers' },
        { id: '9', cantonese: '西裝', meaning: 'suit' },
        { id: '10', cantonese: '更衣室', meaning: 'fitting room' }
    ]
}

function shuffle<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5)
}

function generateOptions(correct: DailyItem, pool: DailyItem[]) {
    const distractors = shuffle(pool.filter(w => w.id !== correct.id)).slice(0, 3)
    return shuffle([correct, ...distractors])
}

const dailyPool = mockWeakWords()
const questions = shuffle(dailyPool)

const currentIndex = ref(0)
const selected = ref<string | null>(null)
const showResult = ref(false)
const xp = ref(0)
const correctCount = ref(0)

const currentQuestion = computed(() => questions[currentIndex.value])
const options = computed(() =>
    generateOptions(currentQuestion.value, dailyPool)
)

function selectAnswer(answer: string) {
    if (showResult.value) return

    selected.value = answer
    showResult.value = true

    if (answer === currentQuestion.value.meaning) {
        xp.value += 5
        correctCount.value++
    }
}

function nextQuestion() {
    if (currentIndex.value < questions.length - 1) {
        currentIndex.value++
        selected.value = null
        showResult.value = false
    }
}

const progressPercent = computed(() => {
    const answered =
        showResult.value
            ? currentIndex.value + 1
            : currentIndex.value

    return Math.round((answered / questions.length) * 100)
})

const completed = computed(() =>
    currentIndex.value === questions.length - 1 && showResult.value
)
</script>

<template>
    <div class="max-w-xl mx-auto px-4 py-8">

        <h1 class="text-2xl font-semibold text-center mb-4">
            Daily Training
        </h1>

        <div class="text-center mb-4">
            <p>🔥 Streak: 3 days</p>
            <p>XP Today: {{ xp }}</p>
        </div>

        <div class="w-full bg-gray-200 rounded-full h-3 mb-6">
            <div class="bg-purple-500 h-3 rounded-full transition-all duration-300"
                :style="{ width: progressPercent + '%' }" />
        </div>

        <div v-if="!completed" class="bg-white shadow p-6 rounded-xl">

            <p class="text-xl font-medium text-center mb-6">
                {{ currentQuestion.cantonese }}
            </p>

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
                class="mt-6 w-full bg-purple-600 text-white p-3 rounded-lg">
                Next
            </button>

        </div>

        <div v-else class="text-center bg-white shadow p-6 rounded-xl">
            <h2 class="text-xl font-semibold mb-4">
                Daily Complete!
            </h2>
            <p class="mb-2">Correct: {{ correctCount }} / {{ questions.length }}</p>
            <p class="mb-4">XP Earned: {{ xp }}</p>
            <p class="text-gray-500">
                Come back tomorrow to continue your streak.
            </p>
        </div>

    </div>
</template>
