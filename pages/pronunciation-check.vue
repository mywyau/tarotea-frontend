<script setup lang="ts">

definePageMeta({
  ssr: false
})

const recording = ref(false)
const mediaRecorder = ref<MediaRecorder | null>(null)

let audioChunks: Blob[] = []

const transcript = ref("")
const feedback = ref("")
const loading = ref(false)

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

    const formData = new FormData()
    formData.append("audio", audioBlob)

    loading.value = true

    const res = await $fetch("/api/pronunciation-check", {
      method: "POST",
      body: formData
    })

    transcript.value = res.transcript
    feedback.value = res.feedback

    loading.value = false
  }

  mediaRecorder.value.start()
  recording.value = true
}

function stopRecording() {
  mediaRecorder.value?.stop()
  recording.value = false
}

</script>

<template>
  <div class="max-w-xl mx-auto p-6">

    <h1 class="text-2xl font-bold mb-6">
      Pronunciation Prototype 🎤
    </h1>

    <div v-if="supported" class="space-y-4">

      <button v-if="!recording" @click="startRecording" class="px-4 py-2 bg-blue-500 text-black rounded">
        Start Recording
      </button>

      <button v-if="recording" @click="stopRecording" class="px-4 py-2 bg-red-500 text-black rounded">
        Stop Recording
      </button>

      <div v-if="loading">
        Processing pronunciation...
      </div>

      <div v-if="transcript">
        <h2 class="font-semibold mt-4">Transcript</h2>
        <p>{{ transcript }}</p>
      </div>

      <div v-if="feedback">
        <h2 class="font-semibold mt-4">Feedback</h2>
        <p>{{ feedback }}</p>
      </div>

    </div>

    <div v-else>
      Your browser does not support microphone recording.
    </div>

  </div>
</template>