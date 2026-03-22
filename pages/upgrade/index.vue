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
        <ul class="text-left text-gray-700 space-y-2 max-w-sm mx-auto">
          <li>• Full access to all content</li>
          <li>• 3000 Echo Lab requests per month</li>
          <li>• Randomised exercises and tests</li>
          <li>• High quality audio for every word</li>
          <li>• Neatly organised structured content</li>
          <li>• XP tracking for all words</li>
          <li>• Access new topics, words, features added regularly</li>
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