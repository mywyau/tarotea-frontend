<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue';

</script>

<template>
  <div class="min-h-screen flex flex-col overflow-x-hidden bg-[#F6E1E1]/30">
    <BlankNavBar />

    <main class="flex-1">
      <ClientOnly>
        <Analytics />
      </ClientOnly>
      <NuxtPage />
    </main>

    <AppFooter />
  </div>
</template>

<style>
.fluid-progress-fill {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.fluid-progress-fill::before,
.fluid-progress-fill::after {
  content: '';
  position: absolute;
  inset: -35% -20%;
  pointer-events: none;
}

.fluid-progress-fill::before {
  background:
    radial-gradient(120% 65% at 25% 45%, rgba(255, 255, 255, 0.4), transparent 62%),
    radial-gradient(100% 60% at 70% 55%, rgba(255, 255, 255, 0.24), transparent 64%);
  opacity: 0.9;
  animation: fluid-wave-drift 4.2s linear infinite;
}

.fluid-progress-fill::after {
  background: linear-gradient(110deg,
      rgba(255, 255, 255, 0) 18%,
      rgba(255, 255, 255, 0.24) 48%,
      rgba(255, 255, 255, 0) 78%);
  mix-blend-mode: screen;
  animation: fluid-sheen-shift 2.8s ease-in-out infinite;
}

@keyframes fluid-wave-drift {
  0% {
    transform: translateX(-18%) translateY(0) scale(1);
  }

  50% {
    transform: translateX(12%) translateY(-4%) scale(1.02);
  }

  100% {
    transform: translateX(36%) translateY(0) scale(1);
  }
}

@keyframes fluid-sheen-shift {
  0% {
    transform: translateX(-60%);
    opacity: 0.25;
  }

  40% {
    opacity: 0.7;
  }

  100% {
    transform: translateX(75%);
    opacity: 0.2;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fluid-progress-fill::before,
  .fluid-progress-fill::after {
    animation: none;
  }
}
</style>
