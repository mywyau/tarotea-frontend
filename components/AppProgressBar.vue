<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    value: number
    max?: number
    tone?: 'primary' | 'success' | 'dojo'
    size?: 'xs' | 'sm' | 'md'
    label?: string
    showValue?: boolean
  }>(),
  {
    max: 100,
    tone: 'primary',
    size: 'md',
    label: 'Progress',
    showValue: false,
  },
)

const percent = computed(() => {
  const max = props.max > 0 ? props.max : 100
  return Math.min(Math.max((props.value / max) * 100, 0), 100)
})
</script>

<template>
  <div
    class="app-progress"
    :class="[`app-progress--${tone}`, `app-progress--${size}`]"
    role="progressbar"
    :aria-label="label"
    :aria-valuenow="Math.round(percent)"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div class="app-progress__fill" :style="{ width: `${percent}%` }">
      <span class="app-progress__glow" />
    </div>

    <span v-if="showValue" class="sr-only">{{ Math.round(percent) }}%</span>
  </div>
</template>

<style scoped>
.app-progress {
  --progress-track: rgba(229, 231, 235, 0.82);
  --progress-fill: linear-gradient(90deg, #a78bfa 0%, #f0abfc 48%, #60a5fa 100%);
  --progress-glow: rgba(255, 255, 255, 0.72);
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.22)),
    var(--progress-track);
  box-shadow:
    inset 0 1px 2px rgba(15, 23, 42, 0.12),
    0 1px 0 rgba(255, 255, 255, 0.85);
}

.app-progress--xs {
  height: 0.25rem;
}

.app-progress--sm {
  height: 0.5rem;
}

.app-progress--md {
  height: 0.75rem;
}

.app-progress--success {
  --progress-fill: linear-gradient(90deg, #34d399 0%, #86efac 52%, #22c55e 100%);
  --progress-glow: rgba(236, 253, 245, 0.82);
}

.app-progress--dojo {
  --progress-fill: linear-gradient(90deg, #f5b7b1 0%, #f8d58f 45%, #9fd6bf 100%);
  --progress-glow: rgba(255, 247, 237, 0.82);
}

.app-progress__fill {
  position: relative;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  border-radius: inherit;
  background: var(--progress-fill);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.42),
    0 0.35rem 1rem rgba(124, 58, 237, 0.18);
  transition: width 500ms cubic-bezier(0.22, 1, 0.36, 1);
}

.app-progress__fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.18) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.18) 50%,
    rgba(255, 255, 255, 0.18) 75%,
    transparent 75%,
    transparent
  );
  background-size: 1rem 1rem;
  opacity: 0.26;
}

.app-progress__glow {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 2.25rem;
  border-radius: inherit;
  background: linear-gradient(90deg, transparent, var(--progress-glow));
  transform: translateX(45%);
}

@media (prefers-reduced-motion: reduce) {
  .app-progress__fill {
    transition-duration: 1ms;
  }
}
</style>
