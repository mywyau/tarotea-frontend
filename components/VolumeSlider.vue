<script setup lang="ts">
const volume = defineModel<number>({ required: true })

const fillPercentage = computed(() => {
  const normalizedVolume = Math.min(1, Math.max(0, Number(volume.value) || 0))
  return `${Math.round(normalizedVolume * 100)}%`
})
</script>

<template>
  <input
    v-model.number="volume"
    type="range"
    min="0"
    max="1"
    step="0.01"
    aria-label="Volume"
    class="volume-slider h-2 w-full cursor-pointer rounded-full"
    :style="{ '--volume-fill': fillPercentage }"
  />
</template>

<style scoped>
.volume-slider {
  appearance: none;
  background: linear-gradient(
    to right,
    #2563eb 0%,
    #2563eb var(--volume-fill),
    #bfdbfe var(--volume-fill),
    #bfdbfe 100%
  );
  box-shadow: inset 0 0 0 1px rgb(37 99 235 / 20%);
}

.volume-slider::-webkit-slider-thumb {
  width: 1rem;
  height: 1rem;
  appearance: none;
  border: 2px solid white;
  border-radius: 9999px;
  background: #1d4ed8;
  box-shadow: 0 1px 3px rgb(15 23 42 / 35%);
  transition: background-color 150ms ease, transform 150ms ease;
}

.volume-slider::-moz-range-track {
  height: 0.5rem;
  border-radius: 9999px;
  background: #bfdbfe;
  box-shadow: inset 0 0 0 1px rgb(37 99 235 / 20%);
}

.volume-slider::-moz-range-progress {
  height: 0.5rem;
  border-radius: 9999px;
  background: #2563eb;
}

.volume-slider::-moz-range-thumb {
  width: 0.75rem;
  height: 0.75rem;
  border: 2px solid white;
  border-radius: 9999px;
  background: #1d4ed8;
  box-shadow: 0 1px 3px rgb(15 23 42 / 35%);
  transition: background-color 150ms ease, transform 150ms ease;
}

.volume-slider:hover::-webkit-slider-thumb {
  background: #1e40af;
  transform: scale(1.08);
}

.volume-slider:hover::-moz-range-thumb {
  background: #1e40af;
  transform: scale(1.08);
}

.volume-slider:focus-visible {
  outline: 3px solid rgb(147 197 253 / 75%);
  outline-offset: 3px;
}
</style>
