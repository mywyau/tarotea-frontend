<script setup lang="ts">
definePageMeta({
  ssr: false,
  middleware: "auth-required",
})

const expectedChinese = ref("你")
const expectedJyutping = ref("nei5")

const recording = ref(false)
const loading = ref(false)
const errorMessage = ref("")
const recordingUrl = ref<string | null>(null)
const mediaRecorder = ref<MediaRecorder | null>(null)
const streamRef = ref<MediaStream | null>(null)
const recorderMimeType = ref("audio/webm")
const recordedBlob = ref<Blob | null>(null)

const result = ref<null | {
  heardJyutping: string
  expectedJyutping: string
  soundScore: number
  toneScore: number
  overallScore: number
  matchType: string
  feedback: string
  toneErrors: Array<{ syllable: number; expected: string; heard: string }>
  expectedTokens: string[]
  heardTokens: string[]
}>(null)

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

async function startRecording() {
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    errorMessage.value = "MediaRecorder is not available on this browser/device."
    return
  }

  errorMessage.value = ""
  result.value = null
  audioChunks = []

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.value = stream

    const mimeType = getSupportedMimeType()
    recorderMimeType.value = mimeType

    mediaRecorder.value = new MediaRecorder(stream, { mimeType })

    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.value.onstop = () => {
      const blob = new Blob(audioChunks, { type: recorderMimeType.value })
      recordedBlob.value = blob

      if (recordingUrl.value) {
        URL.revokeObjectURL(recordingUrl.value)
      }

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
  if (!mediaRecorder.value || mediaRecorder.value.state === "inactive") {
    return
  }

  mediaRecorder.value.stop()
  recording.value = false
}

async function runToneCheck() {
  if (!recordedBlob.value) {
    errorMessage.value = "Please record audio first."
    return
  }

  if (!expectedJyutping.value.trim()) {
    errorMessage.value = "Expected jyutping is required."
    return
  }

  loading.value = true
  errorMessage.value = ""

  try {
    const form = new FormData()
    const extension = recorderMimeType.value.includes("mp4") ? "m4a" : "webm"

    form.append("audio", recordedBlob.value, `tone-word.${extension}`)
    form.append("expectedJyutping", expectedJyutping.value.trim())

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
      <h1 class="text-3xl font-bold">Tone Check V1 (Word Only)</h1>
      <p class="mt-2 text-sm text-slate-300">
        Manual tester page for the new word-level tone scoring endpoint.
      </p>

      <div class="mt-6 grid gap-4 rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
        <label class="grid gap-1">
          <span class="text-xs uppercase tracking-wide text-slate-400">Expected Chinese (optional)</span>
          <input
            v-model="expectedChinese"
            class="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm"
            type="text"
            placeholder="你"
          >
        </label>

        <label class="grid gap-1">
          <span class="text-xs uppercase tracking-wide text-slate-400">Expected Jyutping (required)</span>
          <input
            v-model="expectedJyutping"
            class="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm"
            type="text"
            placeholder="nei5"
          >
        </label>

        <div class="flex flex-wrap gap-3">
          <button
            class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
            :disabled="recording || loading"
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
            :disabled="recording || !recordedBlob || loading"
            @click="runToneCheck"
          >
            {{ loading ? "Checking..." : "Run Tone Check" }}
          </button>
        </div>

        <p v-if="recording" class="text-sm text-amber-300">Recording... speak now.</p>

        <audio
          v-if="recordingUrl"
          class="w-full"
          controls
          :src="recordingUrl"
        />

        <p v-if="errorMessage" class="rounded-lg border border-rose-500/60 bg-rose-950/30 p-3 text-sm text-rose-200">
          {{ errorMessage }}
        </p>
      </div>

      <div
        v-if="result"
        class="mt-6 rounded-2xl border border-slate-700 bg-slate-900/60 p-5"
      >
        <h2 class="text-xl font-semibold">Result</h2>

        <dl class="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div><dt class="text-slate-400">Expected Jyutping</dt><dd>{{ result.expectedJyutping }}</dd></div>
          <div><dt class="text-slate-400">Heard Jyutping</dt><dd>{{ result.heardJyutping || "(empty)" }}</dd></div>
          <div><dt class="text-slate-400">Sound Score</dt><dd>{{ result.soundScore }}</dd></div>
          <div><dt class="text-slate-400">Tone Score</dt><dd>{{ result.toneScore }}</dd></div>
          <div><dt class="text-slate-400">Overall Score</dt><dd>{{ result.overallScore }}</dd></div>
          <div><dt class="text-slate-400">Match Type</dt><dd>{{ result.matchType }}</dd></div>
        </dl>

        <p class="mt-3 text-sm text-slate-200">{{ result.feedback }}</p>

        <div v-if="result.toneErrors?.length" class="mt-4 rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 text-sm">
          <p class="font-medium text-amber-200">Tone mismatches</p>
          <ul class="mt-2 list-disc pl-5 text-amber-100">
            <li v-for="toneError in result.toneErrors" :key="`${toneError.syllable}-${toneError.expected}`">
              Syllable {{ toneError.syllable }}: expected {{ toneError.expected }}, heard {{ toneError.heard }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
