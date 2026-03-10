<script setup lang="ts">

definePageMeta({
  ssr: false,
  middleware: "ai-whisper-access"
})

const route = useRoute()
const id = computed(() => decodeURIComponent(route.params.id as string))
const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

const {
  authReady,
  isLoggedIn,
  user,
  entitlement,
  isCanceling,
  currentPeriodEnd,
  resolve
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

const aiUsage = ref<{
  attempts: number
  remaining: number
  limit: number
} | null>(null)


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


async function startRecording() {

  aiState.value = ""   // reset error state
  audioChunks = []

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  streamRef.value = stream

  mediaRecorder.value = new MediaRecorder(stream)

  mediaRecorder.value.ondataavailable = (event) => {
    audioChunks.push(event.data)
  }

  mediaRecorder.value.onstop = async () => {

    const audioBlob = new Blob(audioChunks, { type: "audio/webm" })

    // ⛔ size limit check
    if (audioBlob.size > 1_000_000) { // ~1MB
      alert("Recording is too long. Please keep it under 10 seconds.")
      return
    }

    recordingUrl.value = URL.createObjectURL(audioBlob)

    const formData = new FormData()
    formData.append("audio", audioBlob)
    formData.append("expectedJyutping", word.value.jyutping)
    formData.append("expectedChinese", word.value.word)

    loading.value = true

    try {
      const { getAccessToken } = await useAuth();

      const token = await getAccessToken();

      const res = await $fetch("/api/pronunciation-check", {
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
        // fallback if usage hasn't loaded yet
        aiUsage.value = {
          remaining: res.remainingAttempts,
          attempts: 0,
          limit: 5000
        }

        animateCount(animatedRemaining, res.remainingAttempts)

        const percent = (res.remainingAttempts / 5000) * 100
        animateCount(animatedPercent, percent)
      }

      loading.value = false
    } catch (e: any) {
      aiState.value = 'error'
    } finally {
      loading.value = false
    }
  }

  mediaRecorder.value.start()
  recording.value = true

  recordingTime.value = 0

  timer = setInterval(() => {
    recordingTime.value++

    //  change number 10 to desired time in seconds
    if (recordingTime.value >= MAX_RECORDING_SECONDS) {
      stopRecording()
    }
  }, 1000
  )
}

function stopRecording() {
  mediaRecorder.value?.stop()
  recording.value = false

  // stop microphone
  streamRef.value?.getTracks().forEach(track => track.stop())
  streamRef.value = null

  if (timer) {
    clearInterval(timer)
    timer = null
  }
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
  "Speaking slightly slower can improve recognition accuracy.",
  "Pronounce each syllable clearly and confidently.",
  "Listen to the audio example carefully before recording.",
  "Say the word naturally — not too fast.",
]

const tipIndex = ref(0)

function nextTip() {
  tipIndex.value = (tipIndex.value + 1) % tips.length
}

function prevTip() {
  tipIndex.value =
    (tipIndex.value - 1 + tips.length) % tips.length
}


onMounted(() => {
  supported.value = !!navigator.mediaDevices

  // supported.value = !!(
  // navigator.mediaDevices &&
  // navigator.mediaDevices.getUserMedia
  // )
})

onMounted(() => {
  setInterval(() => {
    nextTip()
  }, 6000)
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
        </div>

        <div class="flex justify-center pt-4">
          <AudioButton v-if="word.audio?.word" :src="`${cdnBase}/audio/${word.audio.word}`" size="lg" />
        </div>

        <div class="mt-4 mb-4 text-sm text-gray-500 space-y-1">
          <p>1. Listen to the word</p>
          <p>2. Record your pronunciation</p>
          <p>3. Get feedback</p>
        </div>

        <div class="flex flex-col items-center gap-3">

          <!-- <div v-if="remainingAttempts !== null" class="text-base text-gray-700">
            {{ remainingAttempts }} attempts remaining this month
          </div> -->

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

          <!-- TODO: fix me please -->
          <!-- <div v-if="aiUsage" class="text-sm text-gray-700 mt-3 space-y-2">

            <div class="font-medium">AI Usage</div>

            <span>
              {{ aiUsage?.remaining?.toLocaleString() ?? 0 }} requests remaining
            </span>

            <div class="w-full h-2 bg-gray-300 rounded overflow-hidden">
              <div class="h-2 bg-blue-300 striped-bar transition-all duration-500"
                :style="{ width: (aiUsage.remaining / aiUsage.limit) * 100 + '%' }"></div>
            </div>

          </div> -->

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

        <!-- the chinese chars are not accurate lets not show for now -->
        <!-- <div v-if="transcript">
        <h2 class="font-semibold mt-4">Transcript</h2>
        <p>{{ transcript }}</p>
      </div> -->

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