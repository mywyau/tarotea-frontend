<script setup lang="ts">
const props = defineProps<{ file: string; featured?: boolean; autoplay?: boolean; variant?: 'plain' | 'filled' }>()

const voice = useCookie<string | null>('audio-voice')
const src = computed(() => `/api/lesson-audio/audio-${voice.value === 'female' ? 'female' : 'male'}/${encodeURIComponent(props.file)}${props.featured ? "?featured=1" : ""}`)
const failed = ref(false)
watch(src, () => { failed.value = false })
</script>

<template>
  <div>
    <AudioButton :key="src" :src="src" :autoplay="autoplay" :variant="variant" label="Listen"
      @played="failed = false" @playback-failed="failed = true" />
    <p v-if="failed" role="status" class="mt-1 text-sm">Audio couldn’t play. Tap Listen to try again.</p>
  </div>
</template>
