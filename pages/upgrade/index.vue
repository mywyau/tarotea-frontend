<script setup lang="ts">

definePageMeta({ layout: 'default' })

import { useUpgrade } from '@/composables/useUpgrade';
import { useMeStateV2 } from '~/composables/useMeStateV2';
import { hasPaidAccess } from '~/utils/levels/permissions';

const {
  authReady,
  isLoggedIn,
  entitlement,
} = useMeStateV2();

const isSubscribed = computed(() =>
  authReady.value && hasPaidAccess(entitlement.value!)
)

// Already paid → manage subscription instead
function upgrade(plan: 'monthly' | 'yearly') {
  if (isSubscribed.value) {
    navigateTo('/account')
    return
  }

  useUpgrade(plan)
}

</script>

<template>
  <main class="min-h-[70vh] px-4 pt-6 pb-6">

    <div class="max-w-md mx-auto">

      <BackLink />

      <!-- Card -->
      <div class="p-10 text-center space-y-6">

        <!-- Icon -->
        <div class="flex justify-center">
          <div class="w-20 h-20 flex items-center justify-center rounded-full" style="background-color:#EAB8E4;">
            <span class="text-4xl">🍵</span>
          </div>
        </div>

        <!-- Title -->
        <h1 class="text-2xl font-semibold">
          Upgrade your plan
        </h1>

        <p class="text-gray-600">
          Unlock all content and learn Cantonese without limits.
        </p>

        <!-- Benefits -->
        <ul class="list-disc pl-5 text-left text-gray-700 space-y-2 max-w-sm mx-auto leading-relaxed">
          <li>Get greater language exposure with full access to all content</li>
          <li>Unlock over 2500 word tiles and over 10000 setences to help with your studies</li>
          <li>Train to improve recognition and recall with our randomised quizzes and exercises</li>
          <li>Practice and check your pronunciation with 3000 Echo Lab requests per month</li>
          <li>High quality audio for every word</li>
          <li>Neatly organised and structured content</li>
          <li>Increase exposure to unseen and less frequently visited words via our xp system</li>
          <li>Access new topics, words and features</li>
        </ul>

        <!-- Plans -->
        <div v-if="isLoggedIn" class="space-y-3 pt-4">

          <!-- Monthly (Pastel themed) -->
          <button class="block w-full rounded-xl py-3 font-medium transition shadow-sm"
            style="background-color:#A8CAE0;" :class="isSubscribed
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:brightness-110 active:scale-[0.98]'" :disabled="isSubscribed" @click="upgrade('monthly')">
            Monthly plan · £5.99
          </button>

          <!-- Yearly (KEEP BLACK) -->
          <button class="block w-full rounded-xl text-black px-3 py-3 font-medium transition shadow-md" :class="isSubscribed
            ? 'opacity-60 cursor-not-allowed'
            : 'hover:bg-gray-800 active:scale-[0.98]'" :disabled="isSubscribed" @click="upgrade('yearly')"
            style="background-color:rgba(244,205,39,0.35);">
            Yearly plan · £59.99
          </button>

        </div>

        <!-- Subscribed -->
        <p v-if="isSubscribed" class="text-sm text-gray-600">
          You’re already subscribed.
          <NuxtLink to="/account" class="text-purple-500 hover:underline">
            Manage your plan
          </NuxtLink>
        </p>

        <!-- Continue without upgrading -->
        <p v-if="!isSubscribed" class="text-sm text-gray-500">
          <NuxtLink to="/levels" class="hover:underline">
            ← Continue learning without upgrading
          </NuxtLink>
        </p>

        <p class="text-xs text-gray-400 pt-4">
          You can cancel your plan at any time.
        </p>

      </div>
    </div>
  </main>
</template>