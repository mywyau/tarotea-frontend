<script setup lang="ts">
const props = withDefaults(defineProps<{
  src: string
  autoplay?: boolean
  size?: 'sm' | 'md' | 'lg'
  playbackRate?: number
  useVoiceAudio?: boolean
}>(), {
  size: 'md',
  playbackRate: 1,
  useVoiceAudio: true,
})

const { volume } = useAudioVolume()
const { play: playGlobal } = useGlobalAudio()
type AudioVoice = 'male' | 'female'
const audioVoiceCookie = useCookie<AudioVoice | null>('audio-voice', {
  default: () => null,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 180
})
const selectedAudioVoice = computed<AudioVoice>(() => {
  return audioVoiceCookie.value === 'female' ? 'female' : 'male'
})
const transformedSrc = computed(() => {
  if (!props.useVoiceAudio) return props.src
  if (!props.src.includes('/audio/')) return props.src
  return props.src.replace('/audio/', selectedAudioVoice.value === 'female' ? '/audio-female/' : '/audio-male/')
})

const audio = ref<HTMLAudioElement | null>(null)
const hasRetriedWithOriginalSrc = ref(false)

const ensureAudio = () => {
  if (!audio.value) {
    audio.value = new Audio(transformedSrc.value)
  }
}

const play = () => {
  ensureAudio()

  if (!audio.value) return

  audio.value.volume = volume.value
  audio.value.playbackRate = props.playbackRate
  audio.value.currentTime = 0

  // optional, browser support varies
  if ('preservesPitch' in audio.value) {
    audio.value.preservesPitch = true
  }

  playGlobal(audio.value)
}

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'text-xs px-2.5 py-1.5 rounded-lg gap-1.5'
    case 'lg':
      return 'text-base px-5 py-3 rounded-lg gap-2.5'
    case 'md':
    default:
      return 'text-sm px-3 py-2 rounded-lg gap-2'
  }
})

onMounted(() => {
  if (props.autoplay) {
    play()
  }
})

watch(volume, v => {
  if (audio.value) {
    audio.value.volume = v
  }
})

watch(() => props.playbackRate, rate => {
  if (audio.value) {
    audio.value.playbackRate = rate
  }
})

watch(() => props.src, (newSrc) => {
  if (audio.value) {
    audio.value.pause()
    audio.value = new Audio(newSrc)
    audio.value.volume = volume.value
    audio.value.playbackRate = props.playbackRate
    hasRetriedWithOriginalSrc.value = false
  }
})

watch(transformedSrc, (newSrc) => {
  if (audio.value) {
    audio.value.pause()
    audio.value = new Audio(newSrc)
    audio.value.volume = volume.value
    audio.value.playbackRate = props.playbackRate
    hasRetriedWithOriginalSrc.value = false
  }
})

watch(audio, (newAudio) => {
  if (!newAudio) return
  newAudio.onerror = () => {
    if (hasRetriedWithOriginalSrc.value || newAudio.src === props.src) return
    hasRetriedWithOriginalSrc.value = true
    audio.value = new Audio(props.src)
    if (!audio.value) return
    audio.value.volume = volume.value
    audio.value.playbackRate = props.playbackRate
    playGlobal(audio.value)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (audio.value) {
    audio.value.pause()
    audio.value.src = ''
    audio.value = null
  }
})
</script>

<template>
  <button
    @click="play"
    :class="[
      'inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] shadow-sm',
      'border border-transparent bg-[#A8CAE0] text-black hover:brightness-110',
      sizeClass
    ]"
    aria-label="Play audio"
  >
    <span aria-hidden="true">▶︎</span>
    <span v-if="props.size !== 'sm'">
      Play
    </span>
  </button>
</template>
