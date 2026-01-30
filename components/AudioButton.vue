<script setup lang="ts">
const props = defineProps<{
  src: string
}>()


const { volume } = useAudioVolume()
const { play: playGlobal } = useGlobalAudio()



const audio = ref<HTMLAudioElement | null>(null)

const play = () => {
  if (!audio.value) {
    audio.value = new Audio(props.src)
  }

  // 🔑 MUST apply volume right before playing
  audio.value.volume = volume.value
  audio.value.currentTime = 0
  // audio.value.play()
  playGlobal(audio.value)

}

// 🔁 Update volume while audio is playing
watch(volume, v => {
  if (audio.value) {
    audio.value.volume = v
  }
})
</script>

<template>
  <button @click="play" class="inline-flex items-center justify-center rounded p-2
           bg-gray-100 hover:bg-gray-200 border border-black transition" aria-label="Play audio">
    ▶︎ Play
  </button>
</template>
