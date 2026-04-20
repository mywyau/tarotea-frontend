<script setup lang="ts">
definePageMeta({
  ssr: false,
  middleware: "auth-required",
})

type PitchContour = { values: number[] }
type WordMeta = {
  id?: string
  word?: string
  jyutping?: string
  audio?: {
    word?: string
  }
}

const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase
const route = useRoute()

const wordIdFromRoute = computed(() => {
  const fromParam = route.params.wordId

  if (typeof fromParam === "string") {
    return decodeURIComponent(fromParam)
  }

  if (Array.isArray(fromParam) && fromParam.length) {
    return decodeURIComponent(fromParam[0])
  }

  const fromQuery = route.query.wordId
  return typeof fromQuery === "string" ? decodeURIComponent(fromQuery) : ""
})

const { data: selectedWord } = await useAsyncData<WordMeta | null>(
  () => `tone-word-debug-${wordIdFromRoute.value || "none"}`,
  async () => {
    if (!wordIdFromRoute.value) return null
    return await $fetch(`/api/words/${encodeURIComponent(wordIdFromRoute.value)}` as string)
  },
  { watch: [wordIdFromRoute] },
)

const expectedChinese = computed(() => selectedWord.value?.word ?? "")
const expectedJyutping = computed(() => selectedWord.value?.jyutping ?? "")
const referenceAudioPath = computed(() => {
  const filename = selectedWord.value?.audio?.word
  return filename ? `audio/${filename}` : ""
})
const referenceAudioUrl = computed(() => {
  return referenceAudioPath.value ? `${cdnBase}/${referenceAudioPath.value}` : ""
})

const recording = ref(false)
const loading = ref(false)
const errorMessage = ref("")
const recordingUrl = ref<string | null>(null)
const mediaRecorder = ref<MediaRecorder | null>(null)
const streamRef = ref<MediaStream | null>(null)
const recorderMimeType = ref("audio/webm")
const recordedBlob = ref<Blob | null>(null)

const result = ref<null | {
  expectedJyutping: string
  acousticToneScore: number | null
  referenceToneScore: number | null
  toneScore: number
  overallScore: number
  matchType: string
  feedback: string
}>(null)

const extractedPitchContours = ref<PitchContour[]>([])
const referencePitchContours = ref<PitchContour[]>([])

let audioChunks: Blob[] = []

function getSupportedMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]

  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }

  return "audio/webm"
}

function stopTracks() {
  streamRef.value?.getTracks().forEach((track) => track.stop())
  streamRef.value = null
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

async function extractPitchContoursFromArrayBuffer(arrayBuffer: ArrayBuffer, expectedTokenCount: number): Promise<PitchContour[]> {
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

async function fetchReferenceContours(expectedTokenCount: number): Promise<PitchContour[]> {
  if (!referenceAudioPath.value || !expectedTokenCount) return []

  const response = await fetch(referenceAudioUrl.value)
  if (!response.ok) throw new Error(`Failed to fetch reference audio: ${response.status}`)

  const buffer = await response.arrayBuffer()
  return extractPitchContoursFromArrayBuffer(buffer, expectedTokenCount)
}

function playReferenceAudio() {
  if (!referenceAudioUrl.value) return
  const audio = new Audio(referenceAudioUrl.value)
  audio.play().catch(() => {
    errorMessage.value = "Unable to play reference audio."
  })
}

async function startRecording() {
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    errorMessage.value = "MediaRecorder is not available on this browser/device."
    return
  }

  if (!expectedJyutping.value) {
    errorMessage.value = "Missing word data. Open this page from a word link."
    return
  }

  errorMessage.value = ""
  result.value = null
  extractedPitchContours.value = []
  referencePitchContours.value = []
  audioChunks = []

  try {
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

      if (recordingUrl.value) URL.revokeObjectURL(recordingUrl.value)
      recordingUrl.value = URL.createObjectURL(blob)

      stopTracks()
      mediaRecorder.value = null
    }

    mediaRecorder.value.start()
    recording.value = true
  } catch (error) {
    console.error("[tone-word-v1] failed to record", error)
    errorMessage.value = "Could not start microphone recording."
    stopTracks()
  }
}

function stopRecording() {
  if (!mediaRecorder.value || mediaRecorder.value.state === "inactive") return
  mediaRecorder.value.stop()
  recording.value = false
}

async function runToneCheck() {
  if (!recordedBlob.value) {
    errorMessage.value = "Please record audio first."
    return
  }

  if (!expectedJyutping.value) {
    errorMessage.value = "Missing word data. Open this page from a word link."
    return
  }

  loading.value = true
  errorMessage.value = ""

  try {
    const form = new FormData()
    const extension = recorderMimeType.value.includes("mp4") ? "m4a" : "webm"

    const expectedTokens = tokenizeJyutping(expectedJyutping.value)
    const contours = await extractPitchContours(recordedBlob.value, expectedTokens.length)
    extractedPitchContours.value = contours

    const referenceContours = await fetchReferenceContours(expectedTokens.length)
    referencePitchContours.value = referenceContours

    form.append("audio", recordedBlob.value, `tone-word.${extension}`)
    form.append("expectedJyutping", expectedJyutping.value)
    form.append("pitchSummary", JSON.stringify(contours))
    form.append("referenceSummary", JSON.stringify(referenceContours))

    const auth = await useAuth()
    const token = await auth.getAccessToken()

    result.value = await $fetch("/api/pronunciation-tone-word-v1", {
      method: "POST",
      body: form,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  } catch (error: any) {
    console.error("[tone-word-v1] failed", error)
    errorMessage.value = error?.data?.statusMessage || "Tone check request failed."
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 text-slate-100">
    <div class="mx-auto max-w-3xl px-4 py-10">
      <h1 class="text-3xl font-bold">Tone Check V1 (Non-AI: Tone-Only)</h1>
      <p class="mt-2 text-sm text-slate-300">
        Word ID: <span class="font-semibold">{{ wordIdFromRoute || "(missing)" }}</span>
      </p>

      <div class="mt-6 rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
        <p class="text-xs uppercase tracking-wide text-slate-400">Target Chinese</p>
        <p class="text-3xl font-semibold">{{ expectedChinese || "—" }}</p>

        <p class="mt-3 text-xs uppercase tracking-wide text-slate-400">Target Jyutping</p>
        <p class="text-xl">{{ expectedJyutping || "—" }}</p>

        <div class="mt-4 flex flex-wrap gap-3">
          <button
            class="rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
            :disabled="!referenceAudioUrl"
            @click="playReferenceAudio"
          >
            ▶ Play Reference Audio
          </button>

          <button
            class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
            :disabled="recording || loading || !expectedJyutping"
            @click="startRecording"
          >
            Start Recording
          </button>

          <button
            class="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
            :disabled="!recording || loading"
            @click="stopRecording"
          >
            Stop
          </button>

          <button
            class="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
            :disabled="recording || !recordedBlob || loading || !expectedJyutping"
            @click="runToneCheck"
          >
            {{ loading ? "Checking..." : "Run Tone Check" }}
          </button>
        </div>

        <p v-if="referenceAudioPath" class="mt-3 text-xs text-slate-400">Reference: {{ referenceAudioPath }}</p>
        <p v-else class="mt-3 text-xs text-amber-300">No reference audio found for this word.</p>

        <p v-if="recording" class="mt-2 text-sm text-amber-300">Recording... speak now.</p>

        <audio
          v-if="recordingUrl"
          class="mt-3 w-full"
          controls
          :src="recordingUrl"
        />

        <p v-if="errorMessage" class="mt-3 rounded-lg border border-rose-500/60 bg-rose-950/30 p-3 text-sm text-rose-200">
          {{ errorMessage }}
        </p>
      </div>

      <div v-if="result" class="mt-6 rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
        <h2 class="text-xl font-semibold">Result</h2>

        <dl class="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div><dt class="text-slate-400">Expected Jyutping</dt><dd>{{ result.expectedJyutping }}</dd></div>
          <div><dt class="text-slate-400">Acoustic Tone Score</dt><dd>{{ result.acousticToneScore ?? "n/a" }}</dd></div>
          <div><dt class="text-slate-400">Reference Match Score</dt><dd>{{ result.referenceToneScore ?? "n/a" }}</dd></div>
          <div><dt class="text-slate-400">Final Tone Score</dt><dd>{{ result.toneScore }}</dd></div>
          <div><dt class="text-slate-400">Overall Score</dt><dd>{{ result.overallScore }}</dd></div>
          <div><dt class="text-slate-400">Match Type</dt><dd>{{ result.matchType }}</dd></div>
        </dl>

        <p class="mt-3 text-sm text-slate-200">{{ result.feedback }}</p>

        <p class="mt-2 text-xs text-slate-400">
          Extracted pitch contours: {{ extractedPitchContours.length }} syllable bucket(s) · reference contours: {{ referencePitchContours.length }}
        </p>
      </div>
    </div>
  </div>
</template>
