<script setup lang="ts">
const { muted, toggleMuted } = useJingleMute()
</script>

<template>
  <button
    type="button"
    class="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-4 py-2 text-sm font-semibold text-gray-800 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-300"
    :aria-pressed="muted"
    :aria-label="muted ? 'Unmute quiz jingles' : 'Mute quiz jingles'"
    @click="toggleMuted"
  >
    <span aria-hidden="true" class="text-lg leading-none">
      {{ muted ? '🔇' : '🔔' }}
    </span>
    <span>{{ muted ? 'Jingles off' : 'Jingles on' }}</span>
  </button>
</template>
