<script setup lang="ts">
withDefaults(defineProps<{
  src: string
  autoplay?: boolean
}>(), {
  autoplay: true,
})
</script>

<template>
  <div class="floating-audio-control" aria-live="polite">
    <AudioButton :src="src" :autoplay="autoplay" size="sm" />
  </div>
</template>

<style scoped>
.floating-audio-control {
  position: fixed;
  right: 0.85rem;
  bottom: calc(0.85rem + env(safe-area-inset-bottom, 0px));
  z-index: 70;
}

.floating-audio-control :deep(button) {
  width: 3.1rem;
  height: 3.1rem;
  min-width: 0;
  padding: 0;
  border-radius: 999px;
  box-shadow: 0 10px 22px rgba(17, 24, 39, 0.14);
}

.floating-audio-control :deep(svg) {
  width: 1.25rem;
  height: 1.25rem;
}

@media (min-width: 768px) {
  .floating-audio-control {
    left: calc(50% + 2rem);
    right: auto;
    bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
    transform: translateX(-50%);
  }

  .floating-audio-control::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 7.4rem;
    height: 4rem;
    border: 1px solid rgba(17, 24, 39, 0.08);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.78);
    box-shadow: 0 18px 42px rgba(17, 24, 39, 0.16);
    transform: translate(calc(-50% - 2rem), -50%);
    backdrop-filter: blur(14px);
    z-index: 0;
    pointer-events: none;
  }

  .floating-audio-control :deep(button) {
    position: relative;
    z-index: 1;
    box-shadow: none;
  }
}
</style>
