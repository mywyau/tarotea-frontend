<script setup lang="ts">
definePageMeta({
    ssr: false,
    middleware: ['logged-in'],
})

type DailyDecode = {
    date: string // "YYYY-MM-DD"
    wordId: string
    word: string
    jyutping: string // canonical answer, e.g. "gwai6" or "mou5 so2 wai6"
    meaning?: string
    audioUrl?: string // optional if you host audio assets
}

type AttemptLog = {
    input: string
    passed: boolean
    perfect: boolean
    message: string
}

const MAX_ATTEMPTS = 6

const loading = ref(true)
const errorState = ref<string | null>(null)
const challenge = ref<DailyDecode | null>(null)

const input = ref('')
const attempts = ref<AttemptLog[]>([])
const done = ref(false)

const todayKey = computed(() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
})

const storageKey = computed(() => `tarotea:daily-decode:${todayKey.value}`)

// ---------- Normalization & scoring ----------

function normalizeJyutping(raw: string): string {
    return raw
        .toLowerCase()
        .trim()
        .replace(/[，。,.;:!?]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/-/g, ' ')
}

function hasToneNumbers(jp: string): boolean {
    // Require at least one tone digit 1–6 somewhere.
    return /[1-6]/.test(jp)
}

function baseSound(jp: string): string {
    // Remove tone digits and spaces to compare base phonetics.
    return normalizeJyutping(jp).replace(/[1-6]/g, '').replace(/\s+/g, '')
}

function canonicalSound(jp: string): string {
    // Canonical strict compare: normalized + remove extra spaces
    return normalizeJyutping(jp).replace(/\s+/g, ' ')
}

function scoreAttempt(userRaw: string, answerRaw: string) {
    const user = normalizeJyutping(userRaw)
    const ans = normalizeJyutping(answerRaw)

    const passed = baseSound(user) === baseSound(ans)
    const perfect = canonicalSound(user) === canonicalSound(ans)

    if (!user) {
        return { passed: false, perfect: false, message: 'Type the jyutping with tone numbers 1–6.' }
    }

    if (!passed) {
        return { passed: false, perfect: false, message: 'The sound spelling was wrong and possibly missing tone' }
    }

    if (!hasToneNumbers(user)) {
        return { passed: false, perfect: false, message: 'Try to include tone numbers 1–6.' }
    }

    if (perfect) {
        return { passed: true, perfect: true, message: 'Well Done! Congratulations you nailed the correct sound and tone.' }
    }

    if (passed) {
        return { passed: true, perfect: false, message: 'Close it was the correct sound but wrong tone.' }
    }

    return { passed: false, perfect: false, message: 'Not quite. Next time focus on the syllable shape and ending.' }
}

// ---------- Persistence ----------

function loadSaved() {
    try {
        const raw = localStorage.getItem(storageKey.value)
        if (!raw) return
        const parsed = JSON.parse(raw) as { attempts: AttemptLog[]; done: boolean; challenge?: DailyDecode }
        if (parsed?.attempts) attempts.value = parsed.attempts
        if (typeof parsed?.done === 'boolean') done.value = parsed.done
        // Optional: store challenge to avoid re-fetch mismatch
        if (parsed?.challenge) challenge.value = parsed.challenge
    } catch {
        // ignore corrupted storage
    }
}

function save() {
    try {
        localStorage.setItem(
            storageKey.value,
            JSON.stringify({
                attempts: attempts.value,
                done: done.value,
                challenge: challenge.value,
            })
        )
    } catch {
        // ignore quota
    }
}

// ---------- Audio ----------

const audio = ref<HTMLAudioElement | null>(null)

function playAudio() {
    if (!challenge.value?.audioUrl) return
    if (!audio.value) audio.value = new Audio(challenge.value.audioUrl)
    audio.value.currentTime = 0
    void audio.value.play()
}

// ---------- Fetch challenge ----------

async function fetchChallenge() {
    loading.value = true
    errorState.value = null

    try {
        // If you have auth/entitlement, you can add token here.
        // const { getAccessToken } = await useAuth()
        // const token = await getAccessToken()

        const res = await $fetch<DailyDecode>('/api/daily/jyutping', {
            method: 'GET',
            // headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })

        // If we already loaded a saved challenge for today, keep it
        if (!challenge.value) challenge.value = res

        // Safety: if saved challenge exists but different date, reset
        if (challenge.value?.date && challenge.value.date !== todayKey.value) {
            attempts.value = []
            done.value = false
            challenge.value = res
            save()
        }
    } catch (e: any) {
        errorState.value = e?.data?.message || e?.message || 'Failed to load today’s challenge.'
    } finally {
        loading.value = false
    }
}

// ---------- Submit ----------

const attemptsLeft = computed(() => Math.max(0, MAX_ATTEMPTS - attempts.value.length))

const lastAttempt = computed(() => attempts.value[attempts.value.length - 1] || null)

const revealAllowed = computed(() => attemptsLeft.value === 0 && !done.value)

const everpassed = computed(() =>
    attempts.value.some(a => a.passed)
)

const everPerfect = computed(() =>
    attempts.value.some(a => a.perfect)
)

const xpAward = computed(() => {
    // Flat XP approach (still “flat”, but optionally scaled by attempts)
    // If you want strictly flat, set both to the same number.
    return {
        perfect: 30,
        passed: 10,
    }
})

async function awardXp(result: { passed: boolean; perfect: boolean }) {
    // optional: call backend to award XP / log daily completion
    // Keep it safe: only award once when first completed.
    try {
        if (!challenge.value) return
        await $fetch('/api/daily/jyutping/complete', {
            method: 'POST',
            body: {
                date: todayKey.value,
                wordId: challenge.value.wordId,
                passed: result.passed,
                perfect: result.perfect,
            },
        })
    } catch {
        // don’t block UI if XP logging fails
    }
}

async function submit() {
    if (!challenge.value || done.value) return
    if (attemptsLeft.value <= 0) return

    const result = scoreAttempt(input.value, challenge.value.jyutping)

    attempts.value.push({
        input: input.value.trim(),
        passed: result.passed,
        perfect: result.perfect,
        message: result.message,
    })

    input.value = ''

    // 1️⃣ Perfect → finish immediately
    if (result.perfect) {
        done.value = true
        save()
        await awardXp(result)
        return
    }

    // 2️⃣ Base match only → allow more attempts
    if (result.passed && !result.perfect) {
        // move cursor to end automatically
        nextTick(() => {
            const el = document.querySelector('input')
            el?.focus()
        })
        save()
        return
    }

    // 3️⃣ Wrong answer → check if exhausted
    if (attemptsLeft.value === 0) {
        done.value = true
        save()
    }
}

function revealAnswer() {
    if (!challenge.value) return

    done.value = true
    input.value = ''

    // ✅ Don't add "(reveal)" into attempts anymore.
    // The UI already has a reveal button + the answer section below.
    save()
}

function resetForToday(options?: { refetch?: boolean }) {
    // Stop any playing audio
    if (audio.value) {
        audio.value.pause()
        audio.value.currentTime = 0
    }

    // Clear UI state
    input.value = ''
    attempts.value = []
    done.value = false

    // Clear persisted state for today
    try {
        localStorage.removeItem(storageKey.value)
    } catch {
        // ignore
    }

    // Optional: also clear cached challenge so fetch can re-hydrate it
    if (options?.refetch) {
        challenge.value = null
        void fetchChallenge()
    } else {
        // keep the same challenge, just reset progress
        save()
    }
}

onMounted(async () => {
    loadSaved()
    await fetchChallenge()
    save()
})
</script>

<template>
    <main class="mx-auto max-w-xl px-6 py-12">
        <header class="space-y-2">
            <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
                Daily Jyutping Decode
            </h1>
            <p class="text-sm text-gray-600">
                One word per day. Type the jyutping with tone numbers (1–6).
                If your sound is right, you pass. Tone accuracy earns you a better score.
            </p>
        </header>

        <section class="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div v-if="loading" class="text-sm text-gray-600">
                Loading today’s word…
            </div>

            <div v-else-if="errorState" class="text-sm text-red-700">
                {{ errorState }}
            </div>

            <div v-else-if="challenge" class="space-y-5">
                <!-- Word display -->
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <div class="text-4xl font-medium text-gray-900">
                            {{ challenge.word }}
                        </div>
                        <div v-if="challenge.meaning" class="mt-1 text-sm text-gray-600">
                            {{ challenge.meaning }}
                        </div>
                    </div>

                    <button v-if="challenge.audioUrl"
                        class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 active:scale-[0.99] transition"
                        @click="playAudio" type="button">
                        Play audio
                    </button>

                    <button
                        class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 active:scale-[0.99] transition"
                        @click="resetForToday()" type="button">
                        Reset
                    </button>
                </div>

                <!-- Input -->
                <form class="space-y-3" @submit.prevent="submit">
                    <label class="block text-sm font-medium text-gray-800">
                        Your jyutping
                    </label>

                    <input v-model="input" :disabled="done || attemptsLeft <= 0" autocomplete="off" inputmode="text"
                        placeholder=""
                        class="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-gray-400" />

                    <div class="flex items-center justify-between">
                        <div class="text-xs text-gray-600">
                            Attempts left: {{ attemptsLeft }} / {{ MAX_ATTEMPTS }}
                        </div>

                        <button
                            class="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:brightness-110 active:scale-[0.99] transition disabled:opacity-40"
                            :disabled="done || attemptsLeft <= 0 || !input.trim()" type="submit">
                            Submit
                        </button>
                    </div>

                    <p v-if="lastAttempt" class="text-sm"
                        :class="lastAttempt.perfect ? 'text-emerald-700' : lastAttempt.passed ? 'text-amber-500' : 'text-red-700'">
                        {{ lastAttempt.message }}
                    </p>
                </form>

                <!-- Attempts log -->
                <div v-if="attempts.length" class="pt-2">
                    <div class="text-xs font-semibold text-gray-700 mb-2">Attempts</div>
                    <ul class="space-y-2">
                        <li v-for="(a, idx) in attempts" :key="idx"
                            class="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                            <div class="flex items-center justify-between">
                                <div class="text-sm text-gray-900">
                                    <span class="font-mono">You answered: {{ a.input }}</span>
                                </div>
                                <div class="text-xs"
                                    :class="a.perfect ? 'text-emerald-700' : a.passed ? 'text-amber-500' : 'text-red-500'">
                                    <span v-if="a.perfect">Perfect</span>
                                    <span v-else-if="a.passed">Attempt {{ idx + 1 }}</span>
                                    <span v-else>Attempt {{ idx + 1 }}</span>
                                </div>
                            </div>
                            <!-- <div class="mt-1 text-sm"
                                :class="a.perfect ? 'text-emerald-700' : a.passed ? 'text-amber-500' : 'text-red-500'">
                                {{ a.message }}
                            </div> -->
                        </li>
                    </ul>
                </div>

                <!-- Completion -->
                <div v-if="done" class="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                    <div class="mt-1 text-sm text-gray-700" v-if="challenge?.jyutping">
                        <span class="text-gray-500">Answer:</span>
                        <span class="font-mono font-bold ml-2">{{ challenge.jyutping }}</span>
                    </div>

                    <div class="mt-3 text-sm text-gray-600">
                        <span class="pt-1">
                            Come back tomorrow for your new word.
                        </span>
                    </div>
                </div>

                <!-- Reveal (only if failed all attempts and not done) -->
                <div v-if="revealAllowed" class="pt-1">
                    <p v-if="!everpassed" class="mt-2 text-xs text-black mb-4">
                         Daily challenge failed. Try again tomorrow.
                    </p>

                    <p v-else-if="everpassed && !everPerfect" class="mt-2 text-xs text-black mb-4">
                        You were very close. Check the tone and try again tomorrow.
                    </p>
                    <button
                        class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition pt-4"
                        type="button" @click="revealAnswer">
                        Reveal answer
                    </button>

                </div>

                <!-- Calm tip turn this into a carousel -->
                <div class="pt-2 text-xs text-gray-500">
                    Tip: There is no downside to making attempts
                </div>
            </div>
        </section>
    </main>
</template>