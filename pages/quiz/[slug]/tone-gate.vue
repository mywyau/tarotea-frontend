<script setup lang="ts">
definePageMeta({
  ssr: false,
  middleware: ["auth-required", "level-quiz-access", "tone-check-paid-access"],
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
}

const PASS_SCORE = 40
const QUIZ_SIZE = 10
const QUIZ_DURATION_SECONDS = 120

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
const timedOut = ref(false)
const secondsLeft = ref(QUIZ_DURATION_SECONDS)

const loading = ref(false)
const submitting = ref(false)
const recording = ref(false)
const errorMessage = ref("")
const feedback = ref("")
const lastToneScore = ref<number | null>(null)

const recordedBlob = ref<Blob | null>(null)
const recordingUrl = ref<string | null>(null)
const recorderMimeType = ref("audio/webm")
const mediaRecorder = ref<MediaRecorder | null>(null)
const streamRef = ref<MediaStream | null>(null)
let audioChunks: Blob[] = []

let timerInterval: ReturnType<typeof setInterval> | null = null
let currentWordAudio: HTMLAudioElement | null = null

const currentWord = computed(() => quizWords.value[currentIndex.value] ?? null)
const progressLabel = computed(() => `${Math.min(currentIndex.value + 1, QUIZ_SIZE)} / ${QUIZ_SIZE}`)
const currentWordAudioUrl = computed(() => {
  const id = currentWord.value?.id
  return id ? `${cdnBase}/audio/${id}.mp3` : ""
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

function resetRecordingState() {
  recordedBlob.value = null
  if (recordingUrl.value) URL.revokeObjectURL(recordingUrl.value)
  recordingUrl.value = null
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
  if (rms < 0.01) return 0

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
  if (allWords.value.length < QUIZ_SIZE) {
    errorMessage.value = "Not enough words available to start this quiz."
    return
  }

  errorMessage.value = ""
  feedback.value = ""
  lastToneScore.value = null
  finished.value = false
  timedOut.value = false
  currentIndex.value = 0
  passedCount.value = 0
  quizWords.value = shuffle(allWords.value).slice(0, QUIZ_SIZE)
  secondsLeft.value = QUIZ_DURATION_SECONDS
  started.value = true
  resetRecordingState()

  stopTimer()
  timerInterval = setInterval(() => {
    secondsLeft.value -= 1
    if (secondsLeft.value <= 0) {
      secondsLeft.value = 0
      timedOut.value = true
      finished.value = true
      stopTimer()
    }
  }, 1000)
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
    lastToneScore.value = null
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
  errorMessage.value = ""
  feedback.value = ""

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

    lastToneScore.value = result.toneScore
    feedback.value = result.feedback

    if (result.toneScore > PASS_SCORE) {
      passedCount.value += 1
      await playCurrentWordAudio()

      if (currentIndex.value >= QUIZ_SIZE - 1) {
        finished.value = true
        stopTimer()
      } else {
        currentIndex.value += 1
      }

      resetRecordingState()
    }
  } catch (err) {
    console.error("[tone-gate] submit failed", err)
    errorMessage.value = "Could not score your pronunciation. Please try again."
  } finally {
    submitting.value = false
  }
}

const formattedTime = computed(() => {
  const minutes = Math.floor(secondsLeft.value / 60)
  const seconds = secondsLeft.value % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
})

onBeforeUnmount(() => {
  stopTimer()
  stopTracks()
  if (recordingUrl.value) URL.revokeObjectURL(recordingUrl.value)
  currentWordAudio?.pause()
})
</script>

<template>
  <main class="mx-auto max-w-3xl px-4 py-8 text-white">
    <header class="mb-6">
      <h1 class="text-2xl font-semibold">Tone Gate Quiz</h1>
      <p class="mt-2 text-sm text-gray-300">
        10 words, timed. You can only move forward when your tone score is above
        <span class="font-semibold text-emerald-300">{{ PASS_SCORE }}</span>.
      </p>
    </header>

    <section
      class="rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6"
    >
      <div v-if="pending || loading" class="text-sm text-gray-300">Loading quiz words…</div>
      <div v-else-if="error" class="text-sm text-rose-300">
        Failed to load quiz data. Please refresh and try again.
      </div>
      <div v-else-if="!started">
        <p class="text-sm text-gray-300">
          Press start to begin a {{ QUIZ_SIZE }}-word timed pronunciation gate challenge.
        </p>
        <button
          class="mt-4 rounded-lg bg-emerald-500 px-4 py-2 font-medium text-black hover:bg-emerald-400"
          @click="startQuiz"
        >
          Start Quiz
        </button>
      </div>

      <div v-else-if="finished" class="space-y-3">
        <h2 class="text-xl font-semibold">
          {{ timedOut ? "Time's up!" : "Quiz complete!" }}
        </h2>
        <p class="text-sm text-gray-300">
          Passed words: <span class="font-semibold text-emerald-300">{{ passedCount }}</span> / {{ QUIZ_SIZE }}
        </p>
        <p class="text-sm text-gray-300">
          Time left: <span class="font-semibold">{{ formattedTime }}</span>
        </p>
        <button
          class="rounded-lg bg-sky-500 px-4 py-2 font-medium text-black hover:bg-sky-400"
          @click="startQuiz"
        >
          Restart
        </button>
      </div>

      <div v-else-if="currentWord" class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p>Progress: <span class="font-semibold">{{ progressLabel }}</span></p>
          <p>Passed: <span class="font-semibold text-emerald-300">{{ passedCount }}</span> / {{ QUIZ_SIZE }}</p>
          <p>Time left: <span class="font-semibold text-amber-300">{{ formattedTime }}</span></p>
        </div>

        <div class="rounded-xl border border-white/10 bg-black/30 p-4">
          <p class="text-xs uppercase tracking-wider text-gray-400">Target Chinese</p>
          <p class="mt-1 text-3xl font-bold">{{ currentWord.word }}</p>
          <p class="mt-3 text-xs uppercase tracking-wider text-gray-400">Target Jyutping</p>
          <p class="mt-1 text-xl font-semibold">{{ currentWord.jyutping }}</p>
          <p v-if="currentWord.meaning" class="mt-2 text-sm text-gray-300">{{ currentWord.meaning }}</p>
        </div>

        <div class="flex flex-wrap gap-3">
          <button
            class="rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white disabled:opacity-40"
            :disabled="recording || submitting"
            @click="startRecording"
          >
            Start Recording
          </button>
          <button
            class="rounded-lg bg-rose-500 px-4 py-2 font-medium text-white disabled:opacity-40"
            :disabled="!recording || submitting"
            @click="stopRecording"
          >
            Stop Recording
          </button>
          <button
            class="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-black disabled:opacity-40"
            :disabled="recording || !recordedBlob || submitting"
            @click="submitAttempt"
          >
            {{ submitting ? "Scoring..." : "Check Tone" }}
          </button>
        </div>

        <p v-if="recording" class="text-sm text-amber-300">Recording... speak now.</p>
        <audio v-if="recordingUrl" class="w-full" controls :src="recordingUrl" />

        <div v-if="lastToneScore !== null" class="rounded-xl border border-white/10 bg-black/30 p-4">
          <p class="text-sm">
            Tone score:
            <span class="font-semibold" :class="lastToneScore > PASS_SCORE ? 'text-emerald-300' : 'text-amber-300'">
              {{ lastToneScore }}
            </span>
            <span class="text-gray-300"> (need > {{ PASS_SCORE }} to progress)</span>
          </p>
          <p class="mt-2 text-sm text-gray-200">{{ feedback }}</p>
        </div>
      </div>

      <p v-if="errorMessage" class="mt-4 text-sm text-rose-300">{{ errorMessage }}</p>
    </section>
  </main>
</template>
