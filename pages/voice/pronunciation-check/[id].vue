<script setup lang="ts">

definePageMeta({
  ssr: false,
  middleware: "coming-soon"
})

const route = useRoute()

const id = computed(() => decodeURIComponent(route.params.id as string))

const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

const { data, error } = await useFetch(
  () => `/api/words/${id.value}`,
  {
    key: () => `word-${id.value}`,
    server: true
  }
)

const word = computed(() => data.value)

const recording = ref(false)
const mediaRecorder = ref<MediaRecorder | null>(null)

let audioChunks: Blob[] = []

const transcript = ref("")
const feedback = ref("")
const loading = ref(false)
const score = ref<number | null>(null)
const recordingUrl = ref<string | null>(null)

const supported = ref(false)

onMounted(() => {
  supported.value = !!navigator.mediaDevices

  // supported.value = !!(
  // navigator.mediaDevices &&
  // navigator.mediaDevices.getUserMedia
  // )
})

async function startRecording() {

  audioChunks = []

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

  mediaRecorder.value = new MediaRecorder(stream)

  mediaRecorder.value.ondataavailable = (event) => {
    audioChunks.push(event.data)
  }

  mediaRecorder.value.onstop = async () => {

    const audioBlob = new Blob(audioChunks, { type: "audio/webm" })

    recordingUrl.value = URL.createObjectURL(audioBlob)

    const formData = new FormData()
    formData.append("audio", audioBlob)
    formData.append("expectedJyutping", word.value.jyutping)
    formData.append("expectedChinese", word.value.word)

    loading.value = true

    const res = await $fetch("/api/pronunciation-check", {
      method: "POST",
      body: formData
    })

    transcript.value = res.transcript
    feedback.value = res.feedback
    score.value = res.score

    loading.value = false
  }

  mediaRecorder.value.start()
  recording.value = true
}

function stopRecording() {
  mediaRecorder.value?.stop()
  recording.value = false
}

function resetRecording() {
  transcript.value = ""
  feedback.value = ""
  score.value = null
  recordingUrl.value = null
  audioChunks = []
}

function tryAgain() {
  resetRecording()
}

</script>

<template>

  <div class="min-h-[70vh] flex items-center justify-center p-6">
    <div class="max-w-xl w-full text-center space-y-6">
      <h1 class="text-2xl font-bold mb-6">
        Pronunciation
      </h1>

      <div v-if="supported" class="space-y-4">

        <div v-if="word" class="space-y-2">
          <p class="text-4xl font-bold">{{ word.word }}</p>
          <p class="text-gray-500 text-lg">{{ word.jyutping }}</p>
        </div>

        <div class="flex justify-center pt-4">
          <AudioButton v-if="word.audio?.word" :src="`${cdnBase}/audio/${word.audio.word}`" size="lg" />
        </div>

        <div class="flex flex-col items-center gap-3">

          <button v-if="!recording && !transcript" :disabled="loading" @click="startRecording"
            class="px-4 py-2 bg-blue-500 text-black rounded disabled:opacity-50">
            Start Recording
          </button>

          <button v-if="recording" @click="stopRecording" :disabled="loading"
            class="px-4 py-2 bg-red-500 text-black rounded">
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
        </div>

        <button v-if="transcript && !recording" @click="tryAgain" class="px-4 py-2 bg-gray-300 text-black rounded">
          Try Again
        </button>

        <div v-if="score !== null">
          <h2 class="font-semibold mt-4">Score</h2>
          <p>{{ score }} / 100</p>
        </div>

      </div>

      <div v-else>
        Your browser does not support microphone recording.
      </div>

    </div>
  </div>
</template>