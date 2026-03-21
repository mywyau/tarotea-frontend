<script setup lang="ts">

definePageMeta({
  ssr: false,
  middleware: "coming-soon"
})

const route = useRoute()
const id = computed(() => decodeURIComponent(route.params.id as string))
const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

const {
  authReady,
  isLoggedIn,
} = useMeStateV2()


const { data, error } = await useFetch(
  () => `/api/words/${id.value}`,
  {
    key: () => `word-${id.value}`,
    server: true
  }
)

const MAX_RECORDING_SECONDS = 10
const recordingTime = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const word = computed(() => data.value)

const recording = ref(false)
const mediaRecorder = ref<MediaRecorder | null>(null)
const remainingAttempts = ref<number | null>(null)

let audioChunks: Blob[] = []

const transcript = ref("")
const feedback = ref("")
const loading = ref(false)
const aiState = ref("")
const score = ref<number | null>(null)
const recordingUrl = ref<string | null>(null)

const animatedRemaining = ref(0)
const animatedPercent = ref(0)

const supported = ref(false)

const progress = computed(() => {
  return (recordingTime.value / MAX_RECORDING_SECONDS) * 100
})
const streamRef = ref<MediaStream | null>(null)
const recorderMimeType = ref("")

const aiUsage = ref<{
  attempts: number
  remaining: number
  limit: number
} | null>(null)

const practiceTarget = computed(() => {

  const example = word.value?.examples?.[0]

  if (example?.sentence && example?.jyutping) {

    return {
      chinese: example.sentence,
      jyutping: example.jyutping,
      mode: "phrase"
    }
  }

  return {
    chinese: word.value?.word ?? "",
    jyutping: word.value?.jyutping ?? "",
    mode: "word"
  }
})

async function fetchAIUsage() {
  if (!isLoggedIn.value) return

  const auth = await useAuth()
  const token = await auth.getAccessToken()

  const usage = await $fetch<{
    attempts: number
    remaining: number
    limit: number
  }>("/api/ai/usage", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  })

  aiUsage.value = usage

  animateCount(animatedRemaining, usage.remaining)

  const percent = (usage.remaining / usage.limit) * 100
  animateCount(animatedPercent, percent)
}


function getSupportedMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ]

  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }

  return ""
}

async function startRecording() {
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    aiState.value = "error"
    return
  }

  try {
    aiState.value = ""
    transcript.value = ""
    feedback.value = ""
    score.value = null
    audioChunks = []

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.value = stream

    const supportedMimeType = getSupportedMimeType()

    mediaRecorder.value = supportedMimeType
      ? new MediaRecorder(stream, { mimeType: supportedMimeType })
      : new MediaRecorder(stream)

    recorderMimeType.value =
      mediaRecorder.value.mimeType || supportedMimeType || "audio/webm"

    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.value.onstop = async () => {
      try {
        const audioBlob = new Blob(audioChunks, { type: recorderMimeType.value })

        console.log("[frontend] recording debug", {
          recorderMimeType: recorderMimeType.value,
          blobType: audioBlob.type,
          blobSize: audioBlob.size,
          chunkCount: audioChunks.length,
          chunkSizes: audioChunks.map((c) => c.size),
        })

        if (audioBlob.size < 1000) {
          console.error("[frontend] audio blob too small")
          aiState.value = "error"
          return
        }

        if (audioBlob.size > 1_000_000) {
          alert("Recording is too long. Please keep it under 10 seconds.")
          return
        }

        if (!practiceTarget.value.chinese || !practiceTarget.value.jyutping) {
          aiState.value = "error"
          return
        }

        if (recordingUrl.value) {
          URL.revokeObjectURL(recordingUrl.value)
        }

        recordingUrl.value = URL.createObjectURL(audioBlob)

        const extension = recorderMimeType.value.includes("mp4") ? "m4a" : "webm"

        const formData = new FormData()
        formData.append("audio", audioBlob, `recording.${extension}`)
        formData.append("expectedJyutping", practiceTarget.value.jyutping)
        formData.append("expectedChinese", practiceTarget.value.chinese)
        formData.append("targetMode", practiceTarget.value.mode)

        loading.value = true

        const { getAccessToken } = await useAuth()
        const token = await getAccessToken()

        const res = await $fetch<{
          transcript: string
          feedback: string
          score: number
          remainingAttempts: number
          limit: number
        }>("/api/pronunciation-check", {
          method: "POST",
          body: formData,
          headers: { Authorization: `Bearer ${token}` },
        })

        transcript.value = res.transcript
        feedback.value = res.feedback
        score.value = res.score
        remainingAttempts.value = res.remainingAttempts

        if (aiUsage.value) {
          aiUsage.value.remaining = res.remainingAttempts
          animateCount(animatedRemaining, res.remainingAttempts)

          const percent = (res.remainingAttempts / aiUsage.value.limit) * 100
          animateCount(animatedPercent, percent)

          aiUsage.value.attempts = aiUsage.value.limit - res.remainingAttempts
        } else {
          aiUsage.value = {
            remaining: res.remainingAttempts,
            attempts: 0,
            limit: res.limit
          }

          animateCount(animatedRemaining, res.remainingAttempts)

          const percent = (res.remainingAttempts / res.limit) * 100
          animateCount(animatedPercent, percent)
        }
      } catch (e) {
        console.error("[frontend] pronunciation upload failed", e)
        aiState.value = "error"
      } finally {
        loading.value = false
        streamRef.value?.getTracks().forEach((track) => track.stop())
        streamRef.value = null
        mediaRecorder.value = null
      }
    }

    mediaRecorder.value.start()
    recording.value = true
    recordingTime.value = 0

    timer = setInterval(() => {
      recordingTime.value++

      if (recordingTime.value >= MAX_RECORDING_SECONDS) {
        stopRecording()
      }
    }, 1000)
  } catch (e) {
    console.error("[frontend] failed to start recording", e)
    aiState.value = "error"
    recording.value = false
    streamRef.value?.getTracks().forEach((track) => track.stop())
    streamRef.value = null
  }
}

function stopRecording() {
  if (!mediaRecorder.value || mediaRecorder.value.state === "inactive") return

  recording.value = false

  if (timer) {
    clearInterval(timer)
    timer = null
  }

  mediaRecorder.value.stop()
}

function resetRecording() {
  transcript.value = ""
  feedback.value = ""
  score.value = null

  if (recordingUrl.value) {
    URL.revokeObjectURL(recordingUrl.value)
  }

  recordingUrl.value = null
  audioChunks = []

  mediaRecorder.value = null
}

function tryAgain() {
  aiState.value = ""
  resetRecording()
}

const tips = [
  "If something looks wrong, try recording again or refreshing the page.",
  "Make sure the environment is quiet and speech is clear.",
  "Speaking slightly slower may improve recognition accuracy.",
  "Pronounce each syllable clearly and confidently.",
  "Listen to the audio example carefully before recording.",
  "Say the word naturally, but not too fast.",
  "Check the quality of your own recording.",
  "Practice out loud before submitting, this will help your tokens go further.",
  "Make sure the recording captures the entire phrase.",
  "Free users get 10 requests per month.",
  "Upgrade for 5000 requests per month.",
]

const tipIndex = ref(0)

function nextTip() {
  tipIndex.value = (tipIndex.value + 1) % tips.length
}

const router = useRouter()

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    navigateTo("/")
  }
}


onMounted(() => {
  supported.value = !!(
    navigator.mediaDevices &&
    window.MediaRecorder
  )
})


let tipTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  tipTimer = setInterval(() => {
    nextTip()
  }, 6000)
})

onUnmounted(() => {
  if (tipTimer) clearInterval(tipTimer)

  if (recordingUrl.value) {
    URL.revokeObjectURL(recordingUrl.value)
  }

  streamRef.value?.getTracks().forEach((track) => track.stop())
})


watchEffect(() => {
  if (authReady.value && isLoggedIn.value) {
    fetchAIUsage()
  }
})



</script>

<template>

  <div class="min-h-[70vh] flex items-center justify-center p-6">
    <div class="max-w-xl w-full text-center space-y-6">

      <div class="w-full text-left mb-6">
        <button @click="goBack" class="inline-flex items-center text-sm text-black hover:underline">
          ← Back
        </button>
      </div>

      <h1 class="text-2xl font-bold mb-6">
        Echo Lab
      </h1>

      <div v-if="aiState === 'error'" class="text-red-500 text-sm space-y-6">
        <p>
          Something went wrong analysing your pronunciation.
          Please try again.
        </p>

        <button @click="tryAgain" class="px-4 py-2 bg-gray-300 text-black rounded">
          Try Again
        </button>
      </div>

      <div v-if="supported" class="space-y-8">

        <div v-if="word" class="mt-4 space-y-2">
          <p class="text-4xl font-bold">{{ word.word }}</p>
          <p class="text-gray-500 text-lg">{{ word.jyutping }}</p>
          <p class="text-gray-500 text-lg">{{ word.examples[0].sentence }}</p>
        </div>

        <div class="flex justify-center pt-4">
          <AudioButton v-if="word.audio?.word" :src="`${cdnBase}/audio/${word.audio.word}`" size="lg" />
        </div>

        <div class="flex justify-center pt-4">
          <AudioButton v-if="word.audio?.word" :src="`${cdnBase}/audio/${word.audio.examples[0]}`" size="lg" />
        </div>

        <div class="mt-4 mb-4 text-sm text-gray-500 space-y-1">
          <p>1. Listen to the phrase</p>
          <p>2. Record your pronunciation</p>
          <p>3. Get feedback</p>
        </div>

        <div class="flex flex-col items-center gap-3">

          <button v-if="!recording && !transcript" :disabled="loading || recording" @click="startRecording"
            class="px-4 py-2 bg-black font-semibold rounded disabled:opacity-50">
            <span class="bg-gradient-to-r
                  from-[#7ec6f3]
                  via-[#5aaee6]
                  to-[#3f8fd8]
                  bg-clip-text text-transparent
                  hover:brightness-125 transition">
              Start Recording
            </span>
          </button>

          <div class="text-sm text-gray-700 mt-3 space-y-2">

            <div class="font-medium">AI Usage</div>

            <span>
              {{ animatedRemaining.toLocaleString() }} requests remaining
            </span>

            <div class="w-full h-2 bg-gray-300 rounded overflow-hidden">
              <div class="h-2 bg-blue-300" :style="{ width: animatedPercent + '%' }"></div>
            </div>

          </div>

          <div v-if="recording" class="w-64 space-y-1">
            <p class="text-red-500 text-sm">
              Recording... {{ recordingTime }} / {{ MAX_RECORDING_SECONDS }}s
            </p>

            <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div class="bg-red-500 h-2 transition-all duration-200 ease-out" :style="{ width: progress + '%' }">
              </div>
            </div>
          </div>

          <button v-if="recording" @click="stopRecording" :disabled="loading"
            class="px-4 py-2 bg-red-500 text-black font-semibold rounded hover:brightness-125 transition">
            Stop Recording
          </button>

          <p v-if="loading" class="text-gray-500 text-sm flex items-center gap-2">
            <span class="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></span>
            Processing pronunciation...
          </p>

        </div>

        <div v-if="recordingUrl" class="flex flex-col items-center gap-2">
          <p class="text-sm text-gray-500">Your recording</p>
          <audio :src="recordingUrl" controls class="w-64"></audio>
        </div>

        <div v-if="feedback"
          class="mx-auto max-w-md text-left bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
          <h2 class="font-semibold text-gray-700">Feedback</h2>
          <p class="text-gray-800 leading-relaxed">
            {{ feedback }}
          </p>

          <div v-if="score !== null" class="rounded-lg p-4 text-center" :class="{
            'bg-green-50 border border-green-200': score >= 90,
            'bg-yellow-50 border border-yellow-200': score >= 70 && score < 90,
            'bg-red-50 border border-red-200': score < 70
          }">
            <p class="text-sm text-gray-500">Pronunciation Score</p>
            <p class="text-3xl font-bold">{{ score }}</p>
          </div>
        </div>

        <button v-if="transcript && !recording" @click="tryAgain"
          class="px-4 py-2 bg-gray-300 text-black rounded hover:brightness-110 transition">
          Try Again
        </button>
      </div>

      <div v-else>
        Your browser does not support microphone recording.
      </div>

      <div class="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md p-3 max-w-md mx-auto space-y-2">
        <p class="font-medium text-gray-600">
          ⚠️ AI pronunciation feedback
        </p>

        <p>
          This feature uses AI speech recognition to estimate pronunciation.
          Results may occasionally be inaccurate.
        </p>

        <p>
          <strong>Privacy:</strong> Your voice recording is processed securely for
          pronunciation only and is <strong>not stored</strong>. Audio is temporary and is deleted
          immediately after processing.
        </p>
      </div>

      <div class="mt-6 text-xs text-gray-500 p-4 max-w-md mx-auto">

        <p class="font-medium text-gray-600 mb-3">
          Tips
        </p>

        <div class="flex items-center justify-between gap-3">

          <Transition name="tip-fade" mode="out-in">
            <p :key="tipIndex" class="text-center flex-1 leading-relaxed">
              {{ tips[tipIndex] }}
            </p>
          </Transition>

        </div>

        <div class="flex justify-center gap-1 mt-3">
          <span v-for="(tip, i) in tips" :key="i" class="w-1.5 h-1.5 rounded-full"
            :class="i === tipIndex ? 'bg-gray-600' : 'bg-gray-300'" />
        </div>

      </div>


    </div>
  </div>
</template>


<style scoped>
.tip-fade-enter-active,
.tip-fade-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.tip-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.tip-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>