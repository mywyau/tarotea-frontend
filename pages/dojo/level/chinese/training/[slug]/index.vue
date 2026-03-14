<script setup lang="ts">

definePageMeta({
    ssr: false,
    middleware: ['logged-in'],
})

import type {
    BatchAttempt,
    LevelData,
    TrainWord
} from '@/types/jyutping/jyutping-training-types'

import { generateWeightedWordsLevel } from '@/utils/quiz/generateWeightedWordsLevel'
import { playCorrectJingle } from '@/utils/sounds'
import { levelTitles } from '~/utils/levels/levels'

import {
    chineseXp,
    chineseXpHintUsed
} from '@/utils/dojo/xp'

import { totalQuestions, weakestWordRatio } from '@/utils/weakestWords'
import { masteryXp } from '@/utils/xp/helpers'



const route = useRoute()
const slug = computed(() => route.params.slug as string)

const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

const loading = ref(true)
const errorState = ref<string | null>(null)

const words = ref<TrainWord[]>([])

const sessionKey = ref<string>('')

const batchAttempts = ref<BatchAttempt[]>([])

const idx = ref(0)

const input = ref('')

const current = computed(() => words.value[idx.value] ?? null)

const xpDelta = ref<number | null>(null)
const currentXp = ref<number | null>(null)

const hintUsedThisQuestion = ref(false)

const showHint = ref(false)

const fullJyutping = computed(() =>
    current.value?.jyutping ?? ''
)

const live = computed(() => {
    if (!current.value) return { state: 'idle' as const }

    const u = normalizedInput.value
    const a = normalizedAnswer.value

    if (!u) return { state: 'idle' as const }

    if (u === a) {
        return { state: 'perfect' as const }
    }

    if (a.startsWith(u)) {
        return { state: 'partial' as const }
    }

    return { state: 'miss' as const }
})

const chineseChars = computed(() =>
    current.value?.word.split('') ?? []
)

const charStates = computed(() => {
    const answer = normalizedAnswer.value
    const user = normalizedInput.value

    return answer.split('').map((char, i) => {
        if (!user[i]) return 'idle'
        if (user[i] === char) return 'correct'
        return 'idle'
    })
})

const inputRef = ref<HTMLInputElement | null>(null)

async function fetchWords() {
    loading.value = true
    errorState.value = null

    try {
        // 1️⃣ Fetch vocab for level
        const levelData = await $fetch<LevelData>(
            `/api/vocab-quiz/${slug.value}`
        )

        const allWords = Object.values(levelData.categories).flat()

        // 2️⃣ Fetch weakest IDs for this user + level
        const { getAccessToken } = await useAuth()
        const token = await getAccessToken()

        let weakestIds: string[] = []

        try {
            const weakest = await $fetch<{ id: string }[]>(
                '/api/word-progress/weakest',
                {
                    query: { level: slug.value },
                    headers: { Authorization: `Bearer ${token}` }
                }
            )

            weakestIds = weakest.map(w => w.id)
        } catch {
            weakestIds = []
        }

        // 3️⃣ Generate weighted words
        const selected = generateWeightedWordsLevel(
            allWords,
            weakestIds,
            { totalQuestions: totalQuestions, weakestRatio: weakestWordRatio }
        )

        // 4️⃣ Map to your TrainWord format
        words.value = selected.map(w => ({
            wordId: w.id,
            word: w.word,
            jyutping: w.jyutping,
            meaning: w.meaning
        }))

        idx.value = 0
        input.value = ''

    } catch (e: any) {
        errorState.value =
            e?.data?.message || e?.message || 'Failed to load training words.'
    } finally {
        loading.value = false
    }
}

const copied = ref(false)

async function copyChinese() {
    if (!current.value?.jyutping) return

    try {
        await navigator.clipboard.writeText(current.value.jyutping)
        copied.value = true

        // Reset after 1.2s
        setTimeout(() => {
            copied.value = false
        }, 1200)

    } catch (err) {
        console.error('Clipboard failed:', err)
    }
}

let advancing = false
let advanceTimer: ReturnType<typeof setTimeout> | null = null

function resetTraining(options?: { reshuffle?: boolean }) {
    // cancel pending auto-advance
    advancing = false
    if (advanceTimer) {
        clearTimeout(advanceTimer)
        advanceTimer = null
    }

    input.value = ''
    showHint.value = false
    idx.value = 0

    if (options?.reshuffle) {
        words.value = shuffleFisherYates(words.value)
    }
}

const sessionResult = ref<{
    correctCount: number
    totalWords: number
    xpEarned: number
} | null>(null)

async function finalizeBatch() {
    try {
        const { getAccessToken } = await useAuth()
        const token = await getAccessToken()

        const res = await $fetch('/api/jyutping/finalize', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: {
                level: slug.value,
                sessionKey: sessionKey.value,
                attempts: batchAttempts.value,
                mode: 'grind-chinese-level'
            }
        })

        sessionResult.value = res.session
        playQuizCompleteFanfareSong()
    } catch (err) {
        console.error('Finalize failed', err)
    } finally {
        idx.value = words.value.length
    }
}

const wordAudio = ref<HTMLAudioElement | null>(null)

function playCurrentAudio() {
    if (!current.value) return

    const src = `${cdnBase}/audio/${current.value.wordId}.mp3`

    if (!wordAudio.value) {
        wordAudio.value = new Audio()
    }

    wordAudio.value.src = src
    wordAudio.value.currentTime = 0
    wordAudio.value.play().catch(() => { })
}

function advance() {
    if (isComplete.value) return
    if (idx.value < words.value.length - 1) {
        idx.value++
        input.value = ''
        hintUsedThisQuestion.value = false   // 🔥 reset here
        showHint.value = false
        nextTick(() => {
            inputRef.value?.focus()
        })
    }
}

const isComplete = computed(() => idx.value >= words.value.length)

const wordProgressMap = ref<Record<string, { xp: number }>>({})


function startNewSession() {
    sessionKey.value = crypto.randomUUID()
    batchAttempts.value = []
    sessionResult.value = null
    fetchWords()
}

const normalizedInput = computed(() =>
    input.value.replace(/\s+/g, '').trim()
)

const normalizedAnswer = computed(() =>
    current.value?.word.replace(/\s+/g, '').trim() ?? ''
)

watch(
    () => words.value,
    async (ws) => {
        if (!ws.length) return

        const { getAccessToken } = await useAuth()
        const token = await getAccessToken()

        const wordIds = ws.map(w => w.wordId)

        const progressMap = await $fetch<
            Record<string, { xp: number }>
        >('/api/word-progress', {
            query: { wordIds: wordIds.join(',') },
            headers: { Authorization: `Bearer ${token}` }
        })

        wordProgressMap.value = progressMap

        const firstId = ws[0]?.wordId
        currentXp.value = progressMap[firstId]?.xp ?? 0
    },
    { immediate: true }
)

watch(
    () => current.value?.wordId,
    (id) => {
        if (!id) return
        currentXp.value = wordProgressMap.value[id]?.xp ?? 0
        xpDelta.value = null
    }
)

watch(() => live.value.state, async (state) => {

    if (state !== 'perfect') return

    if (advancing) return
    if (!current.value) return

    advancing = true

    if (!batchAttempts.value.some(a => a.wordId === current.value!.wordId)) {

        // Example scoring logic (match your backend logic)

        const hintWasUsed = hintUsedThisQuestion.value

        let delta = chineseXp  // base correct

        if (hintWasUsed) {
            delta = chineseXpHintUsed
        }

        xpDelta.value = delta

        // Optimistic UI update
        currentXp.value = Math.min((currentXp.value ?? 0) + delta, 500)


        batchAttempts.value.push({
            wordId: current.value.wordId,
            passed: true,
            hintUsed: hintWasUsed
        })

        // Clear floating delta after animation
        setTimeout(() => {
            xpDelta.value = null
        }, 1000)
    }

    // 🔔 Play procedural jingle
    playCorrectJingle(0.7)

    // Wait for jingle envelope (~400ms)
    await new Promise(r => setTimeout(r, 600))

    if (batchAttempts.value.length >= words.value.length) {
        await finalizeBatch()
        advancing = false
        return
    }

    advance()
    advancing = false
})

watch(
    () => current.value?.wordId,
    (id) => {
        if (!id || isComplete.value) return

        // small delay feels natural
        setTimeout(() => {
            playCurrentAudio()
        }, 300)
    },
    { immediate: true }
)

onMounted(() => {
    sessionKey.value = crypto.randomUUID()
    fetchWords()

    nextTick(() => {
        inputRef.value?.focus()
    })
})

</script>

<template>
    <main class="mx-auto max-w-xl px-6 py-12">

        <div class="mb-6">
            <NuxtLink :to="`/dojo/level/`" class="text-black text-sm hover:underline">
                ← Back to Level Dojo
            </NuxtLink>
        </div>

        <header class="space-y-4">

            <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
                Chinese Dojo - {{ levelTitles[slug] }}
            </h1>

            <p class="text-sm text-gray-600">
                Type the Chinese characters for each word
            </p>
        </header>

        <section class="mt-8 rounded-2xl bg-white p-5 shadow-sm">
            <div v-if="loading" class="text-sm text-gray-600">
                Loading training words…
            </div>

            <div v-else-if="errorState" class="text-sm text-red-700">
                {{ errorState }}
            </div>

            <div v-else class="space-y-5">
                <!-- Progress + controls -->
                <div v-if="!isComplete" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div class="text-xs text-black">
                        Word {{ idx + 1 }} / {{ words.length }}
                    </div>

                    <div class="flex items-center gap-2">

                        <button
                            class="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                            type="button" @click="resetTraining({ reshuffle: true })">
                            Reset
                        </button>

                        <AudioButton :key="current?.wordId" :src="`${cdnBase}/audio/${current?.wordId}.mp3`" />
                    </div>
                </div>

                <!-- Word display -->
                <div v-if="!isComplete" class="rounded-2xl bg-gray-50 p-5">

                    <transition name="fade-word" mode="out-in">
                        <div :key="current?.wordId" class="text-4xl sm:text-4xl text-center font-medium flex gap-1">
                            <span v-for="(char, i) in chineseChars" :key="i" class="transition-all duration-200" :class="{
                                'text-green-600 font-semibold': charStates[i] === 'correct',
                                'text-gray-400': charStates[i] === 'idle'
                            }">
                                {{ char }}
                            </span>
                        </div>
                    </transition>

                    <div v-if="current.meaning" class="mt-2 text-lg text-gray-700">
                        {{ current.meaning }}
                    </div>

                    <!-- Hint Section -->
                    <div class="mt-4 min-h-[36px]">

                        <button type="button" @click="() => {
                            showHint = !showHint
                            if (showHint) hintUsedThisQuestion = true
                        }" class="text-xs text-gray-500 hover:text-gray-700 transition underline">
                            {{ showHint ? 'Hide Jyutping' : 'Show Jyutping (hint)' }}
                        </button>

                        <transition name="fade-word">
                            <div v-if="showHint" class="mt-2 text-base font-mono text-gray-500 flex items-center gap-2">
                                {{ fullJyutping }}

                                <button type="button" @click="copyChinese"
                                    class="bg-white text-xs px-2 py-1 rounded-md border border-gray-300 hover:bg-gray-100 transition">
                                    {{ copied ? '✓' : 'copy' }}
                                </button>

                            </div>
                        </transition>

                    </div>

                    <!-- XP Row -->
                    <div v-if="!isComplete" class="flex items-center max-w-xs mt-4">

                        <!-- XP Bar -->
                        <div class="w-28 mr-2">
                            <div class="h-[3px] bg-gray-200 rounded">
                                <div class="h-[3px] bg-green-500 rounded transition-all duration-500"
                                    :style="{ width: Math.min((currentXp ?? 0) / masteryXp * 100, 100) + '%' }" />
                            </div>
                        </div>

                        <!-- XP Text + Delta -->
                        <div class="relative flex items-center">
                            <span class="text-sm text-gray-600 whitespace-nowrap">
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

                    <!-- Input -->
                    <div v-if="!isComplete" class="space-y-3">
                        <label class="block text-sm font-medium text-gray-800">
                            Type chinese here:
                        </label>

                        <input ref="inputRef" v-model="input" autofocus autocomplete="off" inputmode="text"
                            class="w-full rounded-2xl border-2 border-gray-300 px-4 py-4 text-xl font-mono tracking-wide outline-none focus:border-black transition" />

                        <div v-if="!isComplete" class="pt-2 text-xs text-gray-500">
                            Tip: try typing without spaces, only chinese is accepted, flex those typing skills :)
                        </div>

                    </div>

                    <div class="h-24 sm:h-0"></div>
                </div>


                <div v-if="sessionResult" class="space-y-8 text-center">

                    <h2 class="text-2xl font-semibold">
                        Good job! Keep going!
                    </h2>

                    <p class="text-gray-600 text-base uppercase">
                        {{ sessionResult.correctCount }} words completed
                    </p>

                    <p class="text-green-600 text-2xl font-semibold">
                        +{{ sessionResult.xpEarned }}
                    </p>

                    <button class="rounded-lg bg-black text-white px-6 py-3 hover:bg-gray-800 transition"
                        @click="startNewSession">
                        Play again
                    </button>
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

.fade-word-enter-active,
.fade-word-leave-active {
    transition: opacity 0.15s ease;
}

.fade-word-enter-from,
.fade-word-leave-to {
    opacity: 0;
}
</style>
