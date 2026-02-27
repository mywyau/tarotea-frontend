<script setup lang="ts">

definePageMeta({
    ssr: false,
    middleware: ['logged-in'],
})

import { generateWeightedWordsLevel } from '@/utils/quiz/generateWeightedWordsLevel'

type TrainWord = {
    wordId: string
    word: string
    jyutping: string
    meaning?: string
    audioUrl?: string
}

type AttemptLog = {
    input: string
    passed: boolean
    perfect: boolean
    message: string
}

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

const BATCH_SIZE = 5

const loading = ref(true)
const errorState = ref<string | null>(null)

const words = ref<TrainWord[]>([])

const sessionKey = ref<string>('')

type BatchAttempt = {
    wordId: string
    passed: boolean
    perfect: boolean
}

const batchAttempts = ref<BatchAttempt[]>([])


const idx = ref(0)

const input = ref('')
const attempts = ref<AttemptLog[]>([])

const showHint = ref(true) // faint jyutping

const current = computed(() => words.value[idx.value] ?? null)

const normalizedInput = computed(() => normalizeJyutping(input.value))
const normalizedAnswer = computed(() => (current.value ? normalizeJyutping(current.value.jyutping) : ''))

const inputBase = computed(() => baseSound(normalizedInput.value))     // no tones/spaces
const answerBase = computed(() => baseSound(normalizedAnswer.value))

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
    if (uBase && aBase.includes(uBase)) {
        return { state: 'partial' as const }
    }

    // Otherwise: not matching
    return { state: 'miss' as const }
})

function splitSyllables(jp: string): string[] {
    // Normalize first so spaces/hyphens collapse nicely
    const n = normalizeJyutping(jp)
    if (!n) return []
    return n.split(' ').filter(Boolean)
}

function stripToneToken(token: string): string {
    return token.replace(/[1-6]/g, '')
}

const answerSyllables = computed(() => splitSyllables(current.value?.jyutping ?? ''))
// const userSyllables = computed(() => splitSyllables(input.value))

function splitUserJyutping(raw: string): string[] {
    const normalized = normalizeJyutping(raw).replace(/\s+/g, '')

    // Match sequences like: mou5, so2, wai6
    const matches = normalized.match(/[a-z]+[1-6]/g)

    return matches ?? []
}

const userSyllables = computed(() =>
    splitUserJyutping(input.value)
)

type SylState = 'idle' | 'partial' | 'pass' | 'perfect' | 'miss'

const syllableStates = computed<SylState[]>(() => {
    const ans = answerSyllables.value
    const usr = userSyllables.value

    const currentTypingIndex = Math.min(usr.length - 1, ans.length - 1)

    return ans.map((ansTok, i) => {
        const usrTok = usr[i] ?? ''

        if (!usrTok) return 'idle'

        const ansBase = stripToneToken(ansTok)
        const usrBase = stripToneToken(usrTok)

        if (usrTok === ansTok) return 'perfect'
        if (usrBase && usrBase === ansBase) return 'pass'

        const isCurrentTypingSyl = i === currentTypingIndex
        if (isCurrentTypingSyl && usrBase && ansBase.startsWith(usrBase)) return 'partial'

        return 'miss'
    })
})

// ---------- Normalization & scoring (reuse your daily logic) ----------

function normalizeJyutping(raw: string): string {
    return raw
        .toLowerCase()
        .trim()
        .replace(/[，。,.;:!?]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/-/g, ' ')
}

function hasToneNumbers(jp: string): boolean {
    return /[1-6]/.test(jp)
}

function baseSound(jp: string): string {
    return normalizeJyutping(jp).replace(/[1-6]/g, '').replace(/\s+/g, '')
}

function canonicalSound(jp: string): string {
    return normalizeJyutping(jp).replace(/\s+/g, ' ')
}

function scoreAttempt(userRaw: string, answerRaw: string) {
    const user = normalizeJyutping(userRaw)
    const ans = normalizeJyutping(answerRaw)

    if (!user) {
        return { passed: false, perfect: false, message: 'Type the jyutping (with tone numbers 1–6).' }
    }

    // For “easy practice”, still require tone numbers, but keep feedback gentle
    if (!hasToneNumbers(user)) {
        return { passed: false, perfect: false, message: 'Include tone numbers (1–6). It’s okay if the tone is wrong.' }
    }

    const passed = baseSound(user) === baseSound(ans)
    const perfect = canonicalNoSpace(user) === canonicalNoSpace(ans)

    if (perfect) return { passed: true, perfect: true, message: 'Correct sound and tone.' }
    if (passed) return { passed: true, perfect: false, message: 'Correct sound. Tone differs.' }
    return { passed: false, perfect: false, message: 'Not quite — try again.' }
}

const answerRaw = computed(() => normalizedAnswer.value)

const inputNoSpace = computed(() =>
    normalizedInput.value.replace(/\s+/g, '')
)

const chineseChars = computed(() =>
    current.value?.word.split('') ?? []
)

type CharState = 'idle' | 'base' | 'perfect'

const charStates = computed<CharState[]>(() => {
    const chars = chineseChars.value
    const ans = answerSyllables.value
    const usr = userSyllables.value

    return chars.map((_, i) => {
        const ansTok = ans[i]
        const usrTok = usr[i] ?? ''

        if (!ansTok || !usrTok) return 'idle'

        const ansBase = stripToneToken(ansTok)
        const usrBase = stripToneToken(usrTok)

        if (usrTok === ansTok) return 'perfect'
        if (usrBase === ansBase) return 'base'

        return 'idle'
    })
})

type LevelData = {
    level: number
    title: string
    description: string
    categories: Record<string, {
        id: string
        word: string
        jyutping: string
        meaning: string
    }[]>
}

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

    const result = scoreAttempt(input.value, current.value.jyutping)
    attempts.value.push({
        input: input.value.trim(),
        passed: result.passed,
        perfect: result.perfect,
        message: result.message,
    })

    input.value = ''
}

function next() {
    if (!words.value.length) return
    idx.value = Math.min(words.value.length - 1, idx.value + 1)
    input.value = ''
    attempts.value = []
}

function prev() {
    if (!words.value.length) return
    idx.value = Math.max(0, idx.value - 1)
    input.value = ''
    attempts.value = []
}

function resetCurrent() {
    input.value = ''
    attempts.value = []
}

function canonicalNoSpace(jp: string): string {
    return normalizeJyutping(jp)
        .replace(/\s+/g, '')
}

function getCharClass(char: string, index: number) {
    if (char === ' ') return ''

    // Count how many non-space characters exist before this index
    const answerBefore = answerRaw.value
        .slice(0, index)
        .replace(/\s+/g, '')

    const compareIndex = answerBefore.length

    if (inputNoSpace.value[compareIndex] === char) {
        return 'text-green-600 font-semibold'
    }

    return 'text-gray-400'
}

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
    showHint.value = true
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

const successAudio = ref<HTMLAudioElement | null>(null)

function playCurrentAudio() {
    if (!current.value) return

    const src = `${cdnBase}/audio/${current.value.wordId}.mp3`

    if (!successAudio.value) {
        successAudio.value = new Audio()
    }

    successAudio.value.src = src
    successAudio.value.currentTime = 0

    successAudio.value.play().catch(() => { })
}

function advance() {
    if (isComplete.value) return
    if (idx.value < BATCH_SIZE - 1) {
        idx.value++
        input.value = ''
        attempts.value = []
    }
}

const isComplete = computed(() => idx.value >= BATCH_SIZE)

function startNewSession() {
    sessionKey.value = crypto.randomUUID()
    batchAttempts.value = []
    sessionResult.value = null
    fetchWords()
}

onMounted(fetchWords)

watchEffect(() => {
    console.log({
        input: input.value,
        normalizedInput: normalizedInput.value,
        inputBase: inputBase.value,
        answerBase: answerBase.value,
        state: live.value.state,
    })
})

watch(
    () => live.value.state,
    async (state) => {
        if (state !== 'perfect') return
        if (advancing) return
        if (!current.value) return

        advancing = true

        // ✅ only record first perfect per word
        if (!batchAttempts.value.some(a => a.wordId === current.value!.wordId)) {
            batchAttempts.value.push({
                wordId: current.value.wordId,
                passed: true,
                perfect: true
            })
        }

        playCurrentAudio()

        if (successAudio.value) {
            successAudio.value.onended = async () => {
                await new Promise(r => setTimeout(r, 200))

                // ✅ If batch full → finalize
                if (batchAttempts.value.length >= BATCH_SIZE) {
                    await finalizeBatch()
                    advancing = false   // ← important
                    return
                }

                advance()
                advancing = false
            }
        }
    }
)

onMounted(() => {
    sessionKey.value = crypto.randomUUID()
})

</script>

<template>
    <main class="mx-auto max-w-xl px-6 py-12">

        <div class="mb-6">
            <NuxtLink :to="`/jyutping/training`" class="text-black text-sm hover:underline">
                ← Back to Dojo
            </NuxtLink>
        </div>

        <header class="space-y-2">
            <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
                Jyutping Dojo
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

            <div v-else-if="current" class="space-y-5">
                <!-- Progress + controls -->
                <div v-if="!isComplete" class="flex items-center justify-between">
                    <div class="text-xs text-black">
                        Word {{ idx + 1 }} / {{ BATCH_SIZE }}
                    </div>

                    <div class="flex items-center gap-2">

                        <button
                            class="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                            type="button" @click="showHint = !showHint">
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
                            'text-green-600 font-semibold': charStates[i] === 'perfect',
                            'text-amber-500 font-medium': charStates[i] === 'base',
                            'text-gray-900': charStates[i] === 'idle'
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
                            <span v-for="(char, i) in answerRaw" :key="i" class="transition-colors duration-150"
                                :class="getCharClass(char, i)">
                                {{ char }}
                            </span>
                        </div>

                        <button type="button" @click="copyJyutping"
                            class="bg-white text-xs px-2 py-1 rounded-md border border-gray-300 hover:bg-gray-100 transition">
                            {{ copied ? '✓' : 'copy' }}
                        </button>
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

                <div v-if="isComplete && sessionResult" class="space-y-6 text-center">

                    <h2 class="text-2xl font-semibold">
                        Session Complete
                    </h2>

                    <p class="text-gray-600">
                        {{ sessionResult.correctCount }} / {{ BATCH_SIZE }} correct
                    </p>

                    <p class="text-gray-600">
                        +{{ sessionResult.xpEarned }} XP
                    </p>

                    <button class="rounded-xl bg-black text-white px-6 py-3 hover:bg-gray-800 transition"
                        @click="startNewSession">
                        Start New Session
                    </button>

                </div>

                <div v-if="!isComplete" class="pt-2 text-xs text-gray-500">
                    Tip: try typing without spaces
                </div>
            </div>
        </section>
    </main>
</template>