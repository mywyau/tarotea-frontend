<script setup lang="ts">
const props = defineProps<{ file: string; autoplay?: boolean }>()
const { cdnBase } = useRuntimeConfig().public
const voice = useCookie<string | null>('audio-voice')
const src = computed(() => `${cdnBase}/audio-${voice.value === 'female' ? 'female' : 'male'}/${encodeURIComponent(props.file)}`)
const failed = ref(false)
watch(src, () => { failed.value = false })
</script>

<template>
  <div>
    <AudioButton :key="src" :src="src" :autoplay="autoplay" label="Listen"
      @played="failed = false" @playback-failed="failed = true" />
    <p v-if="failed" role="status" class="mt-1 text-sm">Audio couldn’t play. Tap Listen to try again.</p>
  </div>
</template>
