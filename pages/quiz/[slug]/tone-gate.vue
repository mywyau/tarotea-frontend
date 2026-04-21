<script setup lang="ts">
import { playCorrectJingle, playGoodJingle } from "~/utils/sounds"
definePageMeta({
  ssr: false,
  middleware: ["logged-in", "level-quiz-access"],
})

type QuizWord = {
  id: string
  word: string
  jyutping?: string
  meaning?: string
}

type PitchContour = {
  values: number[]
}

type ToneApiResponse = {
  toneScore: number
  overallScore: number
  feedback: string
  acousticToneScore: number | null
  referenceToneScore: number | null
  detectedAcousticTones?: Array<{
    syllable: number
    token: string
    expectedTone: string
    detectedTone: string | null
    confidence: number | null
  }>
}

const PASS_SCORE = 25
const NEAR_PERFECT_PASS_SCORE = 60
const GOOD_JINGLE_MIN_SCORE = 25
const JINGLE_DELAY_MS = 400
const SUCCESS_MESSAGE_MS = 20000
const MAX_QUIZ_SIZE = 10

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

const { getAccessToken } = await useAuth()
const token = await getAccessToken()

const { data, pending, error } = await useFetch<{
  categories?: Record<string, QuizWord[]>
}>(() => `/api/vocab-quiz/v2/${slug.value}`, {
  key: () => `tone-gate-${slug.value}`,
  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
})

const allWords = computed<QuizWord[]>(() => {
  if (!data.value?.categories) return []
  return Object.values(data.value.categories).flat().filter((word) => !!word?.id && !!word?.jyutping)
})

const quizWords = ref<QuizWord[]>([])
const currentIndex = ref(0)
const passedCount = ref(0)
const started = ref(false)
const finished = ref(false)
const elapsedSeconds = ref(0)
const startedAtMs = ref<number | null>(null)

const loading = ref(false)
const submitting = ref(false)
const recording = ref(false)
const errorMessage = ref("")
const feedback = ref("")
const successMessage = ref("")
const lastToneScore = ref<number | null>(null)
const detectedToneRows = ref<ToneApiResponse["detectedAcousticTones"]>([])
const nextWordCountdownMs = ref<number | null>(null)
const rapidMode = ref(false)

const recordedBlob = ref<Blob | null>(null)
const recordingUrl = ref<string | null>(null)
const recorderMimeType = ref("audio/webm")
const mediaRecorder = ref<MediaRecorder | null>(null)
const streamRef = ref<MediaStream | null>(null)
let audioChunks: Blob[] = []
const activeAttemptId = ref(0)

let timerInterval: ReturnType<typeof setInterval> | null = null
let currentWordAudio: HTMLAudioElement | null = null
let nextWordCountdownInterval: ReturnType<typeof setInterval> | null = null

const currentWord = computed(() => quizWords.value[currentIndex.value] ?? null)
const quizSize = computed(() => Math.min(MAX_QUIZ_SIZE, allWords.value.length))
const progressLabel = computed(() => `${Math.min(currentIndex.value + 1, quizSize.value)} / ${quizSize.value}`)
const currentWordAudioUrl = computed(() => {
  const id = currentWord.value?.id
  return id ? `${cdnBase}/audio/${id}.mp3` : ""
})

function stripToneDigit(token: string) {
  return token.replace(/[1-6]$/, "")
}

const detectedToneDisplayRows = computed(() => {
  const rows = detectedToneRows.value ?? []
  const chars = Array.from(currentWord.value?.word ?? "")
  const hasOneToOneChars = chars.length === rows.length

  return rows.map((row, idx) => {
    const base = stripToneDigit(row.token)
    const heardJyutping = row.detectedTone ? `${base}${row.detectedTone}` : `${base}?`
    return {
      ...row,
      character: hasOneToOneChars ? chars[idx] : null,
      heardJyutping,
    }
  })
})
const lastToneLabel = computed(() => {
  if (lastToneScore.value === null) return ""
  if (lastToneScore.value <= PASS_SCORE) return "not quite"
  if (lastToneScore.value <= 60) return "good"
  if (lastToneScore.value <= 80) return "very good"
  return "perfect"
})

const nextWordCountdownSeconds = computed(() => {
  if (nextWordCountdownMs.value === null) return null
  return Math.max(0, Math.ceil(nextWordCountdownMs.value / 1000))
})

function shuffle<T>(arr: T[]) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function clearNextWordCountdown() {
  if (nextWordCountdownInterval) {
    clearInterval(nextWordCountdownInterval)
    nextWordCountdownInterval = null
  }
  nextWordCountdownMs.value = null
}

function resetRecordingState() {
  recordedBlob.value = null
  if (recordingUrl.value) URL.revokeObjectURL(recordingUrl.value)
  recordingUrl.value = null
}

function advanceToNextWord(options?: { countAsPass?: boolean }) {
  if (!started.value || finished.value) return

  if (options?.countAsPass) {
    passedCount.value += 1
  }

  if (currentIndex.value >= quizSize.value - 1) {
    finished.value = true
    if (startedAtMs.value) {
      elapsedSeconds.value = Math.floor((Date.now() - startedAtMs.value) / 1000)
    }
    stopTimer()
  } else {
    currentIndex.value += 1
  }

  clearNextWordCountdown()
  resetRecordingState()
  successMessage.value = ""
  feedback.value = ""
  lastToneScore.value = null
  detectedToneRows.value = []
}

function invalidateActiveAttempt() {
  activeAttemptId.value += 1
  submitting.value = false
}

function stopTracks() {
  streamRef.value?.getTracks().forEach((track) => track.stop())
  streamRef.value = null
}

function getSupportedMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return "audio/webm"
}

function tokenizeJyutping(raw: string) {
  return (raw || "").toLowerCase().match(/[a-z]+[1-6]?/g) ?? []
}

function estimatePitchHz(frame: Float32Array, sampleRate: number) {
  let rms = 0
  for (let i = 0; i < frame.length; i++) rms += frame[i] * frame[i]
  rms = Math.sqrt(rms / frame.length)
  if (rms < 0.006) return 0

  const minHz = 75
  const maxHz = 450
  const minLag = Math.floor(sampleRate / maxHz)
  const maxLag = Math.floor(sampleRate / minHz)

  let bestLag = 0
  let bestCorr = 0

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0
    for (let i = 0; i < frame.length - lag; i++) {
      corr += frame[i] * frame[i + lag]
    }
    if (corr > bestCorr) {
      bestCorr = corr
      bestLag = lag
    }
  }

  if (!bestLag) return 0
  return sampleRate / bestLag
}

function smoothPitches(values: number[]) {
  if (values.length < 5) return values

  const smoothed: number[] = []
  for (let i = 0; i < values.length; i++) {
    const left = Math.max(0, i - 2)
    const right = Math.min(values.length, i + 3)
    const window = values.slice(left, right).sort((a, b) => a - b)
    smoothed.push(window[Math.floor(window.length / 2)])
  }

  return smoothed
}

async function extractPitchContoursFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
  expectedTokenCount: number,
): Promise<PitchContour[]> {
  if (!expectedTokenCount) return []
  const audioContext = new AudioContext()

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))
    const channel = audioBuffer.getChannelData(0)
    const frameSize = 2048
    const hop = 512
    const rawPitches: number[] = []

    for (let offset = 0; offset + frameSize < channel.length; offset += hop) {
      const frame = channel.slice(offset, offset + frameSize)
      const pitch = estimatePitchHz(frame, audioBuffer.sampleRate)
      if (pitch > 0) rawPitches.push(Math.round(pitch))
    }

    if (!rawPitches.length) return []

    const smoothed = smoothPitches(rawPitches)
    const trim = Math.floor(smoothed.length * 0.1)
    const trimmed = smoothed.slice(trim, Math.max(smoothed.length - trim, trim + 1))
    if (!trimmed.length) return []

    const contours: PitchContour[] = []
    const bucketSize = Math.max(1, Math.floor(trimmed.length / expectedTokenCount))
    for (let i = 0; i < expectedTokenCount; i++) {
      const start = i * bucketSize
      const end = i === expectedTokenCount - 1 ? trimmed.length : (i + 1) * bucketSize
      contours.push({ values: trimmed.slice(start, end).slice(0, 32) })
    }

    return contours
  } finally {
    await audioContext.close()
  }
}

async function extractPitchContours(blob: Blob, expectedTokenCount: number): Promise<PitchContour[]> {
  const arrayBuffer = await blob.arrayBuffer()
  return extractPitchContoursFromArrayBuffer(arrayBuffer, expectedTokenCount)
}

async function playCurrentWordAudio() {
  if (!currentWordAudioUrl.value) return
  try {
    currentWordAudio?.pause()
    currentWordAudio = new Audio(currentWordAudioUrl.value)
    await currentWordAudio.play()
  } catch (err) {
    console.warn("[tone-gate] failed to play word audio", err)
  }
}

function startQuiz() {
  if (quizSize.value <= 0) {
    errorMessage.value = "No words available to start this quiz yet."
    return
  }

  errorMessage.value = ""
  feedback.value = ""
  successMessage.value = ""
  lastToneScore.value = null
  detectedToneRows.value = []
  finished.value = false
  currentIndex.value = 0
  passedCount.value = 0
  quizWords.value = shuffle(allWords.value).slice(0, quizSize.value)
  elapsedSeconds.value = 0
  startedAtMs.value = Date.now()
  started.value = true
  resetRecordingState()

  stopTimer()
  timerInterval = setInterval(() => {
    if (!startedAtMs.value) return
    elapsedSeconds.value = Math.floor((Date.now() - startedAtMs.value) / 1000)
  }, 250)
}

async function startRecording() {
  if (!started.value || finished.value) return

  if (!navigator.mediaDevices || !window.MediaRecorder) {
    errorMessage.value = "MediaRecorder is not available on this browser/device."
    return
  }

  try {
    errorMessage.value = ""
    feedback.value = ""
    successMessage.value = ""
    lastToneScore.value = null
    detectedToneRows.value = []
    resetRecordingState()
    audioChunks = []

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.value = stream
    const mimeType = getSupportedMimeType()
    recorderMimeType.value = mimeType
    mediaRecorder.value = new MediaRecorder(stream, { mimeType })

    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) audioChunks.push(event.data)
    }

    mediaRecorder.value.onstop = () => {
      const blob = new Blob(audioChunks, { type: recorderMimeType.value })
      recordedBlob.value = blob
      recordingUrl.value = URL.createObjectURL(blob)
      stopTracks()
      mediaRecorder.value = null
    }

    mediaRecorder.value.start()
    recording.value = true
  } catch (err) {
    console.error("[tone-gate] failed to start recording", err)
    errorMessage.value = "Could not start microphone recording."
    stopTracks()
  }
}

function stopRecording() {
  if (!mediaRecorder.value || mediaRecorder.value.state === "inactive") return
  mediaRecorder.value.stop()
  recording.value = false
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForNextWord(ms: number) {
  clearNextWordCountdown()
  const endsAt = Date.now() + ms
  nextWordCountdownMs.value = ms
  nextWordCountdownInterval = setInterval(() => {
    nextWordCountdownMs.value = Math.max(0, endsAt - Date.now())
  }, 100)

  await wait(ms)
  clearNextWordCountdown()
}

async function submitAttempt() {
  if (!started.value || finished.value || !currentWord.value) return
  if (!recordedBlob.value) {
    errorMessage.value = "Please record your pronunciation first."
    return
  }
  if (!currentWord.value.jyutping) {
    errorMessage.value = "Missing target jyutping for this word."
    return
  }

  submitting.value = true
  const attemptId = activeAttemptId.value + 1
  activeAttemptId.value = attemptId
  const wordIdAtSubmit = currentWord.value.id
  errorMessage.value = ""
  feedback.value = ""
  successMessage.value = ""
  clearNextWordCountdown()

  try {
    const expectedTokens = tokenizeJyutping(currentWord.value.jyutping)
    const contours = await extractPitchContours(recordedBlob.value, expectedTokens.length)

    const form = new FormData()
    const extension = recorderMimeType.value.includes("mp4") ? "m4a" : "webm"
    form.append("audio", recordedBlob.value, `tone-gate.${extension}`)
    form.append("expectedJyutping", currentWord.value.jyutping)
    form.append("pitchSummary", JSON.stringify(contours))

    const result = await $fetch<ToneApiResponse>("/api/pronunciation-tone-word-v1", {
      method: "POST",
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (attemptId !== activeAttemptId.value || currentWord.value?.id !== wordIdAtSubmit) return

    lastToneScore.value = result.toneScore
    feedback.value = result.feedback
    detectedToneRows.value = result.detectedAcousticTones ?? []

    if (!rapidMode.value) {
      await wait(JINGLE_DELAY_MS)
      if (attemptId !== activeAttemptId.value || currentWord.value?.id !== wordIdAtSubmit) return
    }

    if (result.toneScore < GOOD_JINGLE_MIN_SCORE) {
      playIncorrectJingle(0.5)
    } else if (result.toneScore < NEAR_PERFECT_PASS_SCORE) {
      playGoodJingle(0.55)
    }

    if (result.toneScore > PASS_SCORE) {
      if (result.toneScore >= NEAR_PERFECT_PASS_SCORE) {
        playCorrectJingle(0.85)
      }

      if (!rapidMode.value) {
        successMessage.value = "Nice pronunciation — moving to the next word!"
        await waitForNextWord(SUCCESS_MESSAGE_MS)
        if (attemptId !== activeAttemptId.value || currentWord.value?.id !== wordIdAtSubmit) return
      }

      advanceToNextWord({ countAsPass: true })
    }
  } catch (err) {
    console.error("[tone-gate] submit failed", err)
    errorMessage.value = "Could not score your pronunciation. Please try again."
  } finally {
    if (attemptId === activeAttemptId.value) {
      submitting.value = false
    }
  }
}

const formattedElapsedTime = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60)
  const seconds = elapsedSeconds.value % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
})

watch(rapidMode, (enabled) => {
  if (!enabled) return
  clearNextWordCountdown()
  successMessage.value = ""
})

function goToNextWord() {
  if (recording.value) stopRecording()
  invalidateActiveAttempt()
  const hasPassingAttempt = lastToneScore.value !== null && lastToneScore.value > PASS_SCORE
  advanceToNextWord({ countAsPass: hasPassingAttempt })
}

function skipWord() {
  if (recording.value) stopRecording()
  invalidateActiveAttempt()
  advanceToNextWord({ countAsPass: false })
}

onBeforeUnmount(() => {
  stopTimer()
  clearNextWordCountdown()
  stopTracks()
  if (recordingUrl.value) URL.revokeObjectURL(recordingUrl.value)
  currentWordAudio?.pause()
})
</script>

<template>
  <main class="min-h-screen text-gray-900">
    <div class="mx-auto max-w-3xl px-4 py-10">
      <BackLink />

      <header class="mb-6 mt-10">
        <h1 class="text-3xl font-bold">Echo Gecko</h1>
      </header>

      <section class="rounded-2xl border border-fuchsia-100 bg-white/90 p-5 shadow-sm sm:p-6">
        <div v-if="pending || loading" class="text-sm text-gray-600">Loading quiz words…</div>
        <div v-else-if="error" class="rounded-lg border border-rose-300 bg-rose-100 p-3 text-sm text-rose-700">
          Failed to load quiz data. Please refresh and try again.
        </div>
        <div v-else-if="!started" class="space-y-6 text-center">
          <div class="space-y-2">
            <p class="text-xs uppercase tracking-[0.2em] text-gray-500">
              Pronunciation Challenge
            </p>
            <p class="text-sm text-gray-600">
              Complete {{ quizSize }} words and pass each pronunciation attempt to finish.
            </p>
          </div>

          <button
            class="w-full rounded-xl bg-[#A8CAE0] px-4 py-3 text-base font-semibold text-gray-900 transition hover:brightness-105"
            @click="startQuiz">
            Start pronunciation quiz
          </button>

          <section class="rounded-xl border border-fuchsia-100 bg-fuchsia-50/50 p-4 text-left">
            <h3 class="text-sm font-semibold text-gray-900">Before you start</h3>
            <ul class="mt-2 space-y-1 text-sm text-gray-700">
              <li>• Make sure you are in a quiet area and can speak clearly.</li>
              <li>• Make sure there are no microhpone obstructions.</li>
              <li>• Use “Skip” if you are struggling with a word.</li>
            </ul>
          </section>
        </div>

        <div v-else-if="finished" class="space-y-6">
          <div class="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/60 p-5 text-center">
            <p class="text-xs uppercase tracking-[0.2em] text-fuchsia-700">Quiz Complete</p>
            <h2 class="mt-2 text-2xl font-semibold text-gray-900">Nice work!</h2>
            <p class="mt-2 text-sm text-gray-700">
              You passed <span class="font-semibold text-emerald-700">{{ passedCount }}</span> out of
              <span class="font-semibold text-gray-900">{{ quizSize }}</span> words.
            </p>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
              <p class="text-xs uppercase tracking-[0.18em] text-emerald-700">Passed Words</p>
              <p class="mt-2 text-2xl font-semibold text-emerald-700">{{ passedCount }} / {{ quizSize }}</p>
            </div>
            <div class="rounded-xl border border-fuchsia-100 bg-white p-4 text-center">
              <p class="text-xs uppercase tracking-[0.18em] text-fuchsia-700">Total Time</p>
              <p class="mt-2 text-2xl font-semibold text-fuchsia-700">{{ formattedElapsedTime }}</p>
            </div>
          </div>

          <button
            class="w-full rounded-xl bg-[#A8CAE0] px-4 py-3 text-base font-semibold text-gray-900 transition hover:brightness-105"
            @click="startQuiz">
            Play again
          </button>
        </div>

        <div v-else-if="currentWord" class="space-y-4">
          <div
            class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-fuchsia-100 bg-fuchsia-50/60 p-3 text-sm text-gray-700">
            <p>Progress: <span class="font-semibold text-gray-900">{{ progressLabel }}</span></p>
            <p>Passed: <span class="font-semibold text-emerald-700">{{ passedCount }}</span> / {{ quizSize }}</p>
            <p>Elapsed: <span class="font-semibold text-fuchsia-700">{{ formattedElapsedTime }}</span></p>
          </div>

          <div class="rounded-xl border border-fuchsia-100 bg-white p-4">
            <p class="text-xs uppercase tracking-wider text-gray-500">Target Chinese</p>
            <p class="mt-1 text-3xl font-bold text-gray-900">{{ currentWord.word }}</p>
            <p class="mt-3 text-xs uppercase tracking-wider text-gray-500">Target Jyutping</p>
            <p class="mt-1 text-xl font-semibold text-gray-900">{{ currentWord.jyutping }}</p>
            <p v-if="currentWord.meaning" class="mt-2 text-sm text-gray-600">{{ currentWord.meaning }}</p>
            <button
              class="mt-4 rounded-lg bg-[#D6A3D1] px-4 py-2 text-sm font-medium text-gray-900 transition hover:brightness-105 disabled:opacity-50"
              :disabled="submitting || !currentWordAudioUrl" @click="playCurrentWordAudio">
              ▶ Play Chinese Audio
            </button>
          </div>

          <div class="flex flex-wrap gap-3">
            <button
              class="rounded-lg bg-[#A8CAE0] px-4 py-2 text-sm font-medium text-gray-900 transition hover:brightness-105 disabled:opacity-50"
              :disabled="recording || submitting" @click="startRecording">
              Start Recording
            </button>
            <button
              class="rounded-lg bg-[#F4C2D7] px-4 py-2 text-sm font-medium text-gray-900 transition hover:brightness-105 disabled:opacity-50"
              :disabled="!recording || submitting" @click="stopRecording">
              Stop Recording
            </button>
            <button
              class="rounded-lg bg-[#EAB8E4] px-4 py-2 text-sm font-medium text-gray-900 transition hover:brightness-105 disabled:opacity-50"
              :disabled="recording || !recordedBlob || submitting" @click="submitAttempt">
              {{ submitting ? "Scoring..." : "Submit" }}
            </button>
            <button
              class="rounded-lg bg-[#CDE8C9] px-4 py-2 text-sm font-medium text-gray-900 transition hover:brightness-105 disabled:opacity-50"
              @click="goToNextWord">
              Next
            </button>
            <button
              class="rounded-lg bg-[#F6D8B8] px-4 py-2 text-sm font-medium text-gray-900 transition hover:brightness-105 disabled:opacity-50"
              @click="skipWord">
              Skip
            </button>
            <label
              class="inline-flex items-center gap-2 rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-xs text-gray-700">
              <input v-model="rapidMode" type="checkbox" class="h-4 w-4 rounded border-fuchsia-300 text-fuchsia-600" />
              Rapid mode (skip pause only)
            </label>
          </div>

          <p v-if="recording" class="text-sm text-amber-700">Recording... speak now.</p>
          <p v-if="successMessage && !rapidMode"
            class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {{ successMessage }}
            <span v-if="nextWordCountdownSeconds !== null" class="ml-1">
              (next word in {{ nextWordCountdownSeconds }}s)
            </span>
          </p>
          <audio v-if="recordingUrl" class="w-full" controls :src="recordingUrl" />

          <div v-if="lastToneScore !== null" class="rounded-xl border border-fuchsia-100 bg-fuchsia-50/50 p-4">
            <p class="text-sm text-gray-700">
              Feedback:
              <span class="font-semibold" :class="lastToneScore > PASS_SCORE ? 'text-emerald-700' : 'text-amber-700'">
                {{ lastToneLabel }}
              </span>
              <!-- <span class="text-gray-500"> (need above threshold to continue)</span> -->
            </p>
            <p class="mt-2 text-sm text-gray-700">{{ feedback }}</p>
            <div class="mt-3">
              <button
                class="rounded-lg bg-[#CDE8C9] px-3 py-2 text-xs font-medium text-gray-900 transition hover:brightness-105 disabled:opacity-50"
                @click="goToNextWord">
                Next Word
              </button>
            </div>
            <div v-if="detectedToneDisplayRows.length"
              class="mt-3 rounded-lg border border-fuchsia-100 bg-white/80 p-3">
              <p class="text-xs uppercase tracking-wider text-gray-500">Detected tones by syllable</p>
              <!-- <p class="mt-1 text-xs text-gray-500">
                Detected tone is diagnostic. Final score also checks how closely your pitch shape matches the target
                contour.
              </p> -->
              <ul class="mt-2 space-y-1 text-sm text-gray-700">
                <li v-for="row in detectedToneDisplayRows" :key="`tone-row-${row.syllable}`">
                  <span class="font-medium">
                    {{ row.character ? `Character ${row.character}` : `Syllable ${row.syllable}` }}
                  </span>
                  <span class="text-gray-500"> (target {{ row.token }})</span>:
                  heard <span class="font-semibold">{{ row.heardJyutping }}</span>
                  — tone <span class="font-semibold">{{ row.detectedTone ?? "unknown" }}</span>
                  <!-- <span v-if="row.confidence !== null" class="text-gray-500"> -->
                  <!-- (confidence {{ row.confidence }}) -->
                  <!-- </span> -->
                </li>
              </ul>
            </div>
          </div>
        </div>

        <p v-if="errorMessage" class="mt-4 rounded-lg border border-rose-300 bg-rose-100 p-3 text-sm text-rose-700">
          {{ errorMessage }}
        </p>
      </section>
    </div>
  </main>
</template>
