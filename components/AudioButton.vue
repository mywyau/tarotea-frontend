<script setup lang="ts">
const props = defineProps<{
  src: string
  autoplay?: boolean
  size?: 'sm' | 'md' | 'lg'
}>()

const { volume } = useAudioVolume()
const { play: playGlobal } = useGlobalAudio()

const audio = ref<HTMLAudioElement | null>(null)

const play = () => {
  if (!audio.value) {
    audio.value = new Audio(props.src)
  }

  // MUST apply volume right before playing
  audio.value.volume = volume.value
  audio.value.currentTime = 0
  playGlobal(audio.value)

}

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'text-xs px-2 py-1 rounded-md'
    case 'lg':
      return 'text-base px-5 py-3 rounded-md'
    case 'md':
    default:
      return 'text-sm px-3 py-2 rounded-md'
  }
})

onMounted(() => {
  if (props.autoplay) {
    play()
  }
})

// 🔁 Update volume while audio is playing
watch(volume, v => {
  if (audio.value) {
    audio.value.volume = v
  }
})
</script>

<template>
  <button @click="play" :class="[
    'inline-flex items-center justify-center transition border',
    'bg-white/70 hover:bg-white hover:brightness-110',
    sizeClass
  ]" aria-label="Play audio">
    ▶︎
    <span v-if="props.size !== 'sm'" class="ml-2">
      Play
    </span>
  </button>
</template>
