<script setup lang="ts">

definePageMeta({
  ssr: false,
  // middleware: ['coming-soon'],
})

import { chineseSentenceXp, chineseSentenceXpHintUsed } from '@/utils/dojo/xp'
import { playCorrectJingle } from '@/utils/sounds'
import { totalQuestions, weakestWordRatio } from '@/utils/weakestWords'
import { masteryXp } from '@/utils/xp/helpers'
import { levelTitles } from '~/utils/levels/levels'

type TrainSentence = {
  sentenceId: string
  sentence: string
  jyutping: string
  meaning: string
  sourceWordId: string
  sourceWord: string
}

type SentenceLevelResponse = {
  level: number | string
  title?: string
  totalSentences?: number
  items: TrainSentence[]
}

type SentenceBatchAttempt = {
  sentenceId: string
  sourceWordId: string
  passed: boolean
  hintUsed: boolean
}

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const loading = ref(true)
const errorState = ref<string | null>(null)

const sentences = ref<TrainSentence[]>([])
const sessionKey = ref<string>('')

const batchAttempts = ref<SentenceBatchAttempt[]>([])
const idx = ref(0)
const input = ref('')

const xpDelta = ref<number | null>(null)
const currentXp = ref<number | null>(null)

const hintUsedThisQuestion = ref(false)
const showHint = ref(false)

const inputRef = ref<HTMLTextAreaElement | null>(null)

const current = computed(() => sentences.value[idx.value] ?? null)
const isComplete = computed(() => idx.value >= sentences.value.length)

const sessionResult = ref<{
  correctCount: number
  totalWords: number
  xpEarned: number
} | null>(null)

const wordProgressMap = ref<Record<string, { xp: number }>>({})

function normalizeChineseSentence(value: string) {
  return (value || '')
    .replace(/[，。！？、,.!?；：'"“”‘’（）()\[\]\s]/g, '')
    .trim()
}

const normalizedInput = computed(() =>
  normalizeChineseSentence(input.value)
)

const normalizedAnswer = computed(() =>
  normalizeChineseSentence(current.value?.sentence ?? '')
)

const live = computed(() => {
  if (!current.value) return { state: 'idle' as const }

  const u = normalizedInput.value
  const a = normalizedAnswer.value

  if (!u) return { state: 'idle' as const }

  if (u === a) return { state: 'perfect' as const }
  if (a.startsWith(u)) return { state: 'partial' as const }

  return { state: 'miss' as const }
})

function shuffleArray<T>(items: T[]) {
  const arr = [...items]

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }

  return arr
}

function pickWeightedSentences(
  all: TrainSentence[],
  weakestIds: string[],
) {
  const uniqueAll = all.filter(
    (item, index, arr) =>
      arr.findIndex(x => x.sentenceId === item.sentenceId) === index
  )

  const weakestSet = new Set(weakestIds)

  const weak = uniqueAll.filter(s => weakestSet.has(s.sourceWordId))
  const normal = uniqueAll.filter(s => !weakestSet.has(s.sourceWordId))

  const limit = Math.min(totalQuestions, uniqueAll.length)
  const weakTarget = Math.min(
    Math.round(limit * weakestWordRatio),
    weak.length
  )

  const pickedWeak = shuffleArray(weak).slice(0, weakTarget)
  const pickedNormal = shuffleArray(normal).slice(0, limit - pickedWeak.length)

  const selected = [...pickedWeak, ...pickedNormal]

  if (selected.length < limit) {
    const used = new Set(selected.map(s => s.sentenceId))
    const remaining = shuffleArray(
      uniqueAll.filter(s => !used.has(s.sentenceId))
    )

    selected.push(...remaining.slice(0, limit - selected.length))
  }

  return shuffleArray(selected)
}

async function fetchSentences() {
  loading.value = true
  errorState.value = null

  try {
    const levelData = await $fetch<SentenceLevelResponse>(
      `/api/sentences/topics/${slug.value}`
    )

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

    const selected = pickWeightedSentences(levelData.items ?? [], weakestIds)

    sentences.value = selected
    idx.value = 0
    input.value = ''
    showHint.value = false
    hintUsedThisQuestion.value = false
  } catch (e: any) {
    errorState.value =
      e?.data?.message || e?.message || 'Failed to load training sentences.'
  } finally {
    loading.value = false
  }
}

async function copyJyutping() {
  if (!current.value?.jyutping) return

  try {
    await navigator.clipboard.writeText(current.value.jyutping)
  } catch (err) {
    console.error('Clipboard failed:', err)
  }
}

let advancing = false

function resetTraining() {
  advancing = false
  input.value = ''
  showHint.value = false
  hintUsedThisQuestion.value = false
  idx.value = 0
  sentences.value = shuffleArray(sentences.value)
}

async function finalizeBatch() {
  try {
    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()

    const res = await $fetch('/api/sentences/jyutping/finalize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        level: slug.value,
        sessionKey: sessionKey.value,
        attempts: batchAttempts.value,
        mode: 'grind-chinese-sentences-topic',
      }
    })

    sessionResult.value = res.session
  } catch (err) {
    console.error('Finalize failed', err)
  } finally {
    idx.value = sentences.value.length
  }
}

function advance() {
  if (isComplete.value) return

  if (idx.value < sentences.value.length - 1) {
    idx.value++
    input.value = ''
    hintUsedThisQuestion.value = false
    showHint.value = false

    nextTick(() => {
      inputRef.value?.focus()
    })
  }
}

function startNewSession() {
  sessionKey.value = crypto.randomUUID()
  batchAttempts.value = []
  sessionResult.value = null
  fetchSentences()
}

watch(
  () => sentences.value,
  async (items) => {
    if (!items.length) return

    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()

    const wordIds = [...new Set(items.map(s => s.sourceWordId))]

    const progressMap = await $fetch<Record<string, { xp: number }>>(
      '/api/word-progress',
      {
        query: { wordIds: wordIds.join(',') },
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    wordProgressMap.value = progressMap

    const firstId = items[0]?.sourceWordId
    currentXp.value = firstId ? (progressMap[firstId]?.xp ?? 0) : 0
  },
  { immediate: true }
)

watch(
  () => current.value?.sourceWordId,
  (id) => {
    if (!id) return
    currentXp.value = wordProgressMap.value[id]?.xp ?? 0
    xpDelta.value = null
  }
)

watch(
  () => live.value.state,
  async (state) => {
    if (state !== 'perfect') return
    if (advancing) return
    if (!current.value) return

    advancing = true

    if (!batchAttempts.value.some(a => a.sentenceId === current.value!.sentenceId)) {
      const hintWasUsed = hintUsedThisQuestion.value

      let delta = chineseSentenceXp
      if (hintWasUsed) {
        delta = chineseSentenceXpHintUsed
      }

      xpDelta.value = delta
      currentXp.value = Math.min((currentXp.value ?? 0) + delta, masteryXp)

      batchAttempts.value.push({
        sentenceId: current.value.sentenceId,
        sourceWordId: current.value.sourceWordId,
        passed: true,
        hintUsed: hintWasUsed,
      })

      setTimeout(() => {
        xpDelta.value = null
      }, 1000)
    }

    playCorrectJingle(0.7)
    await new Promise(r => setTimeout(r, 600))

    if (batchAttempts.value.length >= sentences.value.length) {
      await finalizeBatch()
      advancing = false
      return
    }

    advance()
    advancing = false
  }
)

onMounted(() => {
  sessionKey.value = crypto.randomUUID()
  fetchSentences()

  nextTick(() => {
    inputRef.value?.focus()
  })
})
</script>

<template>
  <main class="mx-auto max-w-2xl px-6 py-12">
    <div class="mb-6">
      <NuxtLink to="/dojo/topic/" class="text-black text-sm hover:underline">
        ← Back to Topic Dojo
      </NuxtLink>
    </div>

    <header class="space-y-4">
      <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
        Sentence Dojo - {{ levelTitles[slug] }}
      </h1>

      <p class="text-sm text-gray-600">
        Read the meaning and type the full Chinese sentence.
      </p>
    </header>

    <section class="mt-8 rounded-2xl bg-white p-5 shadow-sm">
      <div v-if="loading" class="text-sm text-gray-600">
        Loading training sentences…
      </div>

      <div v-else-if="errorState" class="text-sm text-red-700">
        {{ errorState }}
      </div>

      <div v-else class="space-y-5">
        <div v-if="!isComplete" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="text-xs text-black">
            Sentence {{ idx + 1 }} / {{ sentences.length }}
          </div>

          <button class="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
            type="button" @click="resetTraining">
            Reset
          </button>
        </div>

        <div v-if="!isComplete" class="rounded-2xl bg-gray-50 p-5 space-y-5">
          <div class="space-y-2">
            <div class="text-xs uppercase tracking-wide text-gray-500">
              Sentence
            </div>

            <div class="text-2xl font-medium text-gray-900 leading-relaxed">
              {{ current?.sentence }}
            </div>

            <div class="text-sm text-gray-400 leading-relaxed">
              {{ current?.meaning }}
            </div>
          </div>

          <div class="mt-4 min-h-[36px]">
            <button type="button" @click="() => {
              showHint = !showHint
              if (showHint) hintUsedThisQuestion = true
            }" class="text-xs text-gray-500 hover:text-gray-700 transition underline">
              {{ showHint ? 'Hide Jyutping' : 'Show Jyutping (hint)' }}
            </button>

            <transition name="fade-word">
              <div v-if="showHint" class="mt-2">
                <div class="text-base font-mono break-all leading-relaxed text-gray-500">
                  {{ current?.jyutping }}
                </div>

                <button type="button" @click="copyJyutping"
                  class="mt-2 bg-white text-xs px-2 py-1 rounded-md border border-gray-300 hover:bg-gray-100 transition">
                  copy
                </button>
              </div>
            </transition>
          </div>

          <div class="space-y-2 mt-2">
            <div class="text-sm text-gray-500">
              Target word: <span class="font-medium text-gray-700">{{ current?.sourceWord }}</span>
            </div>

            <div class="flex items-center max-w-xs">
              <div class="w-28 mr-2">
                <div class="h-[3px] bg-gray-200 rounded">
                  <div class="h-[3px] bg-green-500 rounded transition-all duration-500"
                    :style="{ width: Math.min((currentXp ?? 0) / masteryXp * 100, 100) + '%' }" />
                </div>
              </div>

              <div class="relative flex items-center">
                <span class="text-sm text-gray-600 whitespace-nowrap">
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
          </div>

          <div class="space-y-3">
            <label class="block text-sm font-medium text-gray-800">
              Type the Chinese sentence:
            </label>

            <textarea ref="inputRef" v-model="input" rows="3" autocomplete="off"
              class="w-full rounded-2xl border-2 border-gray-300 px-4 py-4 text-xl font-mono tracking-wide outline-none focus:border-black transition resize-none" />

            <div class="pt-2 text-xs text-gray-500">
              Spaces and punctuation are ignored for matching.
            </div>
          </div>
        </div>

        <div v-if="sessionResult" class="space-y-8 text-center">
          <h2 class="text-2xl font-semibold">
            Good job! Keep going!
          </h2>

          <p class="text-gray-600 text-base uppercase">
            {{ sessionResult.correctCount }} sentences completed
          </p>

          <p class="text-green-600 text-2xl font-semibold">
            +{{ sessionResult.xpEarned }} XP
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

.fade-word-enter-active,
.fade-word-leave-active {
  transition: opacity 0.15s ease;
}

.fade-word-enter-from,
.fade-word-leave-to {
  opacity: 0;
}
</style>