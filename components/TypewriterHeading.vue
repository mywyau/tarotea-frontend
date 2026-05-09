<script setup lang="ts">
const props = withDefaults(defineProps<{
  text: string
  tag?: string
  speed?: number
  startDelay?: number
}>(), {
  tag: 'h1',
  speed: 55,
  startDelay: 120,
})

const displayText = ref(props.text)
const isTyping = ref(false)
const prefersReducedMotion = ref(false)
let timeoutId: ReturnType<typeof setTimeout> | undefined
let intervalId: ReturnType<typeof setInterval> | undefined

function clearTimers() {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = undefined
  }

  if (intervalId) {
    clearInterval(intervalId)
    intervalId = undefined
  }
}

function finishImmediately(text = props.text) {
  clearTimers()
  displayText.value = text
  isTyping.value = false
}

function typeText(text = props.text) {
  clearTimers()

  if (prefersReducedMotion.value || !text) {
    finishImmediately(text)
    return
  }

  displayText.value = ''
  isTyping.value = true

  timeoutId = setTimeout(() => {
    let nextIndex = 0

    intervalId = setInterval(() => {
      nextIndex += 1
      displayText.value = text.slice(0, nextIndex)

      if (nextIndex >= text.length) {
        clearTimers()
        isTyping.value = false
      }
    }, props.speed)
  }, props.startDelay)
}

onMounted(() => {
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  typeText(props.text)
})

watch(() => props.text, (nextText) => {
  if (!import.meta.client) {
    displayText.value = nextText
    return
  }

  typeText(nextText)
})

onBeforeUnmount(clearTimers)
</script>

<template>
  <component :is="props.tag" class="typewriter-heading">
    <span aria-hidden="true">{{ displayText }}</span>
    <span class="typewriter-cursor" :class="{ 'is-typing': isTyping }" aria-hidden="true" />
    <span class="sr-only">{{ props.text }}</span>
  </component>
</template>

<style scoped>
.typewriter-heading {
  display: inline-block;
}

.typewriter-cursor {
  display: inline-block;
  width: 0.08em;
  height: 0.92em;
  margin-left: 0.12em;
  transform: translateY(0.08em);
  background: currentColor;
  animation: typewriter-cursor-blink 0.85s steps(1, end) infinite;
}

.typewriter-cursor.is-typing {
  animation-duration: 0.7s;
}

@keyframes typewriter-cursor-blink {
  0%, 45% {
    opacity: 1;
  }

  46%, 100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .typewriter-cursor {
    animation: none;
  }
}
</style>
