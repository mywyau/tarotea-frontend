<script setup lang="ts">
import { jyutPingQuizSelectMetaData } from '~/utils/levels/helpers'
import { canAccessLevel, isFreeLevel } from '~/utils/levels/permissions'


definePageMeta({
  ssr: false,
  middleware: ['logged-in'],
})

const {
  state,
  authReady,
  isLoading,
  isLoggedIn,
  isLoggedOut,
  user,
  entitlement,
  isCanceling,
  currentPeriodEnd,
  resolve,
} = useMeStateV2()

const isComingSoon = (level: any) => level.comingSoon === true

const canEnterLevel = (level: any) => {

  if (isLoggedOut.value) return false

  if (isComingSoon(level)) return false

  if (isFreeLevel(level.number)) return true

  // 🔒 Paid levels require login
  if (!isLoggedIn.value) return false

  return canAccessLevel(isLoggedIn.value, entitlement.value!)
}

</script>

<template>
  <main class="levels-page max-w-5xl mx-auto py-10 px-4 space-y-8">

    <div class="mb-6">
      <NuxtLink :to="`/dojo`" class="text-black text-sm hover:underline">
        ← Dojo
      </NuxtLink>
    </div>

    <!-- Header -->
    <header class="text-center space-y-3 max-w-2xl mx-auto">
      <h1 class="text-3xl font-semibold text-gray-900">
        Level Dojo
      </h1>
      <p class="text-gray-600 text-sm sm:text-base">
        Strenghten your phonetic proficiency with our exercises
      </p>
    </header>

    <!-- Grid -->
    <ul class="grid grid-cols-1 sm:grid-cols-3 gap-6">

      <li v-for="quizLevel in jyutPingQuizSelectMetaData" :key="quizLevel.id" class="
          rounded-2xl
          p-6
          bg-white/75
          backdrop-blur-md
          shadow-md
          transition-all
          duration-150
          flex
          flex-col
          justify-between
          hover:-translate-y-1
          hover:shadow-[0_18px_40px_rgba(0,0,0,0.08)]
        " :class="[
          (!canEnterLevel(quizLevel) || quizLevel.comingSoon)
            ? 'opacity-60'
            : ''
        ]">

        <!-- Title -->
        <div class="space-y-2">
          <h2 class="text-lg font-semibold text-gray-900">
            {{ quizLevel.title }}
          </h2>

          <p class="text-sm text-gray-600 leading-relaxed">
            {{ quizLevel.description }}
          </p>

          <p v-if="quizLevel.comingSoon" class="text-xs text-gray-400 font-medium">
            Coming soon
          </p>
        </div>

        <!-- Buttons -->
        <div v-if="canEnterLevel(quizLevel) && !quizLevel.comingSoon" class="grid grid-cols-2 gap-3 pt-4">
          <NuxtLink :to="`/dojo/level/jyutping/training/${quizLevel.id}`"
            class="rounded-lg text-black text-sm px-2 py-2 font-medium text-center hover:brightness-110"
            style="background-color:#A8CAE0;">
            Jyutping
          </NuxtLink>

          <NuxtLink :to="`/dojo/level/chinese/training/${quizLevel.id}`"
            class="rounded-lg text-black text-sm px-2 py-2 font-medium text-center hover:brightness-110"
            style="background-color:#A8CAE0;">
            Chinese only
          </NuxtLink>

          <NuxtLink :to="`/dojo/level/sentences/chinese/${quizLevel.id}`"
            class="rounded-lg text-black text-sm px-2 py-2 font-medium text-center hover:brightness-110"
            style="background-color:#A8CAE0;">
            Sentences Chinese Only
          </NuxtLink>
        </div>

        <!-- Locked -->
        <p v-else-if="!quizLevel.comingSoon" class="text-xs text-center text-gray-500 pt-4">
          Upgrade to unlock
        </p>

      </li>

    </ul>

  </main>
</template>

<style>
:root {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #ffec95;
  --blush: #F6E1E1;
}

/* Card */
.level-card {
  border-radius: 20px;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.level-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.08);
}

.level-locked {
  opacity: 0.6;
}

/* Buttons */
.level-btn {
  text-align: center;
  padding: 0.6rem 0.75rem;
  font-size: 0.85rem;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.15s ease;
}

/* Colour variations */
.level-btn-yellow {
  background: var(--yellow);
  color: #1f2937;
}
</style>
