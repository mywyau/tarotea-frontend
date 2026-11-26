<script setup lang="ts">
import { Volume2 } from '@lucide/vue'

const props = withDefaults(defineProps<{
  src: string
  autoplay?: boolean
  autoplayDelayMs?: number
  size?: 'sm' | 'md' | 'lg'
  playbackRate?: number
  variant?: 'filled' | 'plain'
  label?: string
}>(), {
  size: 'md',
  variant: 'filled',
  playbackRate: 1,
})

const emit = defineEmits<{
  autoplayBlocked: []
  played: []
  playbackFailed: []
}>()

const { volume } = useAudioVolume()
const { play: playGlobal } = useGlobalAudio()

const audio = ref<HTMLAudioElement | null>(null)
let autoplayTimer: ReturnType<typeof setTimeout> | undefined

let playRequest = 0

const play = async () => {
  clearTimeout(autoplayTimer)
  const request = ++playRequest
  try {
    if (!audio.value) {
      const url = await resolveLessonAudio(props.src)
      if (request !== playRequest) return
      audio.value = new Audio(url)
    }
    audio.value.volume = volume.value
    audio.value.playbackRate = props.playbackRate
    audio.value.currentTime = 0
    if ('preservesPitch' in audio.value) audio.value.preservesPitch = true
    await playGlobal(audio.value)
    emit('played')
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError'
      || (error as { name?: string } | null)?.name === 'NotAllowedError') {
      emit('autoplayBlocked')
      return
    }

    audio.value = null
    console.warn('Audio playback failed', error)
    emit('playbackFailed')
  }
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

const iconClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-3.5 w-3.5'
    case 'lg':
      return 'h-5 w-5'
    case 'md':
    default:
      return 'h-4 w-4'
  }
})

onMounted(() => {
  if (!props.autoplay) return
  if (props.autoplayDelayMs) autoplayTimer = setTimeout(play, props.autoplayDelayMs)
  else void play()
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

watch(() => props.src, () => {
  playRequest++
  audio.value?.pause()
  audio.value = null
})

onBeforeUnmount(() => {
  playRequest++
  clearTimeout(autoplayTimer)
  if (audio.value) {
    audio.value.pause()
    audio.value.src = ''
    audio.value = null
  }
})
</script>

<template>
  <button
    type="button"
    @click="play"
    :class="[
      'inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] text-black',
      variant === 'plain'
        ? 'border-0 bg-transparent shadow-none hover:underline focus-visible:outline-2 focus-visible:outline-current'
        : 'border border-transparent bg-[#A8CAE0] shadow-sm hover:brightness-110',
      sizeClass
    ]"
    :aria-label="label || 'Play audio'"
  >
    <Volume2 :class="iconClass" aria-hidden="true" />

    <span v-if="props.size !== 'sm'">
      {{ label || 'Play' }}
    </span>
  </button>
</template>
