<script setup lang="ts">

definePageMeta({
    ssr: false,
    middleware: ['logged-in'],
})

import type {
    AttemptLog,
    BatchAttempt,
    LevelData,
    TrainWord
} from '@/types/jyutping/jyutping-training-types'

import {
    baseSound,
    canonicalNoSpace,
    normalizeJyutping,
    scoreJyutpingAttempt,
    shuffle,
    splitSyllables,
    splitUserJyutping,
    stripToneToken
} from '@/utils/jyutping/jyutping-utils'

import { levelTitles } from '~/utils/levels/levels'
import { generateWeightedWordsLevel } from '@/utils/quiz/generateWeightedWordsLevel'
import { playCorrectJingle } from '@/utils/sounds'


const route = useRoute()
const slug = computed(() => route.params.slug as string)

const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

const BATCH_SIZE = 5

const loading = ref(true)
const errorState = ref<string | null>(null)

const words = ref<TrainWord[]>([])

const sessionKey = ref<string>('')

const batchAttempts = ref<BatchAttempt[]>([])

const idx = ref(0)

const input = ref('')
const attempts = ref<AttemptLog[]>([])

const showHint = ref(false) // faint jyutping

const current = computed(() => words.value[idx.value] ?? null)

const normalizedInput = computed(() => normalizeJyutping(input.value))
const normalizedAnswer = computed(() => (current.value ? normalizeJyutping(current.value.jyutping) : ''))

const xpDelta = ref<number | null>(null)
const currentXp = ref<number | null>(null)

const hintUsedThisQuestion = ref(false)

const live = computed(() => {
    if (!current.value) return { state: 'idle' as const }

    const u = normalizedInput.value
    const a = normalizedAnswer.value

    if (!u) return { state: 'idle' as const }

    const uBase = baseSound(u)
    const aBase = baseSound(a)

    // ✅ Perfect: exact canonical match including tones/spaces
    if (canonicalNoSpace(u) === canonicalNoSpace(a)) {
        return { state: 'perfect' as const }
    }

    // ✅ Pass: base sound matches (tone may differ)
    if (uBase && uBase === aBase) {
        return { state: 'pass' as const }
    }

    // 👀 Partial: they are typing the right “shape” (prefix match)
    // e.g. user typed "gw" and answerBase starts with "gw"
    if (uBase && aBase.startsWith(uBase)) {
        return { state: 'partial' as const }
    }

    // Otherwise: not matching
    return { state: 'miss' as const }
})

const answerSyllables = computed(() => splitSyllables(current.value?.jyutping ?? ''))

const userSyllables = computed(() => splitUserJyutping(input.value))

const answerBaseNoSpace = computed(() =>
    baseSound(current.value?.jyutping ?? '')
)

const userBaseNoSpace = computed(() =>
    baseSound(input.value)
)


type LetterState = 'idle' | 'correct'

const letterStates = computed<LetterState[]>(() => {
    const ans = answerBaseNoSpace.value
    const usr = userBaseNoSpace.value

    return ans.split('').map((letter, i) => {
        if (!usr[i]) return 'idle'
        if (usr[i] === letter) return 'correct'
        return 'idle'
    })
})

const chineseChars = computed(() =>
    current.value?.word.split('') ?? []
)

const charStates = computed(() => {
    const ans = answerSyllables.value
    const usrBase = userBaseNoSpace.value

    let cursor = 0

    return ans.map((ansTok) => {
        const ansBase = stripToneToken(ansTok)

        const segment = usrBase.slice(cursor, cursor + ansBase.length)

        const fullyCorrect = segment === ansBase

        cursor += ansBase.length

        return fullyCorrect ? 'correct' : 'idle'
    })
})

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
            { totalQuestions: 20, weakestRatio: 0.8 }
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
        attempts.value = []

    } catch (e: any) {
        errorState.value =
            e?.data?.message || e?.message || 'Failed to load training words.'
    } finally {
        loading.value = false
    }
}

// ---------- Actions ----------

function submit() {
    if (!current.value) return

    const result = scoreJyutpingAttempt(input.value, current.value.jyutping)

    attempts.value.push({
        input: input.value.trim(),
        passed: result.passed,
        message: result.message,
    })

    input.value = ''
}

const fullJyutping = computed(() =>
    current.value?.jyutping ?? ''
)

type RenderState = 'idle' | 'correct'

const jyutpingRenderStates = computed<RenderState[]>(() => {
    const full = fullJyutping.value
    const usr = userBaseNoSpace.value

    let letterIndex = 0

    return full.split('').map((char) => {
        // if not a-z letter, don't compare
        if (!/[a-z]/i.test(char)) {
            return 'idle'
        }

        const userChar = usr[letterIndex]

        if (userChar && userChar === char.toLowerCase()) {
            letterIndex++
            return 'correct'
        }

        return 'idle'
    })
})

type SylState = 'idle' | 'correct'

const syllableStates = computed<SylState[]>(() => {
    const ans = answerSyllables.value
    const usr = userSyllables.value

    const currentTypingIndex = usr.length - 1

    return ans.map((ansTok, i) => {
        const usrTok = usr[i]
        if (!usrTok) return 'idle'

        const ansBase = stripToneToken(ansTok)
        const usrBase = stripToneToken(usrTok)

        // fully correct syllable
        if (usrBase === ansBase) return 'correct'

        // only allow prefix match on the currently typing syllable
        if (
            i === currentTypingIndex &&
            ansBase.startsWith(usrBase)
        ) {
            return 'correct'
        }

        return 'idle'
    })
})

const copied = ref(false)

async function copyJyutping() {
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
    attempts.value = []
    showHint.value = false
    idx.value = 0

    if (options?.reshuffle) {
        words.value = shuffle(words.value)
    }
}

const sessionResult = ref<{
    xpEarned: number
    correctCount: number
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
                attempts: batchAttempts.value
            }
        })

        sessionResult.value = res.session
    } catch (err) {
        console.error('Finalize failed', err)
    } finally {
        idx.value = BATCH_SIZE
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
    if (idx.value < BATCH_SIZE - 1) {
        idx.value++
        input.value = ''
        attempts.value = []
        hintUsedThisQuestion.value = false   // 🔥 reset here
        showHint.value = false
    }
}

const isComplete = computed(() => idx.value >= BATCH_SIZE)

const wordProgressMap = ref<Record<string, { xp: number }>>({})


function startNewSession() {
    sessionKey.value = crypto.randomUUID()
    batchAttempts.value = []
    sessionResult.value = null
    fetchWords()
}

onMounted(fetchWords)


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

    if (state !== 'pass' && state !== 'perfect') return

    if (advancing) return
    if (!current.value) return

    advancing = true

    if (!batchAttempts.value.some(a => a.wordId === current.value!.wordId)) {

        // Example scoring logic (match your backend logic)

        const hintWasUsed = hintUsedThisQuestion.value

        let delta = 3  // base correct

        if (hintWasUsed) {
            delta = 1
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

    if (batchAttempts.value.length >= BATCH_SIZE) {
        await finalizeBatch()
        advancing = false
        return
    }

    advance()
    advancing = false
}
)
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
})

</script>

<template>
    <main class="mx-auto max-w-xl px-6 py-12">

        <div class="mb-6">
            <NuxtLink :to="`/jyutping/level/training`" class="text-black text-sm hover:underline">
                ← Back to Dojo
            </NuxtLink>
        </div>

        <header class="space-y-4">

            <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
                Jyutping Dojo - {{ levelTitles[slug] }}
            </h1>

            <p class="text-sm text-gray-600">
                Type the jyutping for each word shown
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
                <div v-if="!isComplete" class="flex items-center justify-between">
                    <div class="text-xs text-black">
                        Word {{ idx + 1 }} / {{ BATCH_SIZE }}
                    </div>

                    <div class="flex items-center gap-2">

                        <button
                            class="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                            type="button" @click="() => {
                                showHint = !showHint
                                if (showHint) hintUsedThisQuestion = true
                            }">
                            {{ showHint ? 'Hide hint' : 'Show hint' }}
                        </button>

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

                    <div class="text-4xl font-medium flex gap-1">
                        <span v-for="(char, i) in chineseChars" :key="i" class="transition-all duration-200" :class="{
                            'text-green-600 font-semibold': charStates[i] === 'correct',
                            'text-gray-400': syllableStates[i] === 'idle'
                        }">
                            {{ char }}
                        </span>
                    </div>

                    <div v-if="current.meaning" class="mt-2 text-lg text-gray-700">
                        {{ current.meaning }}
                    </div>

                    <!-- Faint hint -->
                    <div v-if="showHint" class="mt-3 flex items-center gap-3">
                        <div class="text-lg font-mono select-none">
                            <span v-for="(char, i) in fullJyutping.split('')" :key="i" :class="{
                                'text-green-600 font-semibold': jyutpingRenderStates[i] === 'correct',
                                'text-gray-400': jyutpingRenderStates[i] === 'idle'
                            }">
                                {{ char }}
                            </span>
                        </div>

                        <button type=" button" @click="copyJyutping"
                            class="bg-white text-xs px-2 py-1 rounded-md border border-gray-300 hover:bg-gray-100 transition">
                            {{ copied ? '✓' : 'copy' }}
                        </button>
                    </div>

                </div>

                <!-- XP Row -->
                <div v-if="!isComplete" class="flex items-center max-w-xs">

                    <!-- XP Bar -->
                    <div class="w-28 mr-2">
                        <div class="h-[3px] bg-gray-200 rounded">
                            <div class="h-[3px] bg-green-500 rounded transition-all duration-500"
                                :style="{ width: Math.min((currentXp ?? 0) / 200 * 100, 100) + '%' }" />
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
                <form v-if="!isComplete" class="space-y-3" @submit.prevent="submit">
                    <label class="block text-sm font-medium text-gray-800">
                        Type here:
                    </label>

                    <input :disabled="isComplete" v-model="input" autocomplete="off" inputmode="text" placeholder=""
                        class="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-gray-400" />
                </form>

                <div v-if="isComplete && sessionResult" class="space-y-8 text-center">

                    <h2 class="text-2xl font-semibold">
                        Good job! Keep going!
                    </h2>

                    <p class="text-gray-600 text-base uppercase">
                        {{ sessionResult.correctCount }} / {{ BATCH_SIZE }} words completed
                    </p>

                    <p class="text-green-600 text-2xl font-semibold">
                        +{{ sessionResult.xpEarned }} XP
                    </p>

                    <button class="rounded-lg bg-black text-white px-6 py-3 hover:bg-gray-800 transition"
                        @click="startNewSession">
                        Play again
                    </button>
                </div>

                <div v-if="!isComplete" class="pt-2 text-xs text-gray-500">
                    Tip: try typing without spaces, do not worry about tones.
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
