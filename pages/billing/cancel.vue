<script setup lang="ts">

definePageMeta({ layout: 'default' })

import { useUpgrade } from '@/composables/useUpgrade';
import { hasPaidAccess } from '@/utils/canAccessLevel';

const {
  state,
  authReady,
  isLoggedIn,
  user,
  entitlement,
  // hasPaidAccess,
  isCanceling,
  currentPeriodEnd,
  resolve,
} = useMeStateV2();

function upgrade(billing: 'monthly' | 'yearly') {
  useUpgrade(billing)
}

const isSubscribed = computed(() =>
  isLoggedIn && hasPaidAccess(entitlement.value!)
)

</script>

<template>
  <main class="min-h-[70vh] px-4 pt-6 pb-6">
    <div class="max-w-md mx-auto">
      <div class="p-10 text-center space-y-6">
        <div class="max-w-md w-full text-center space-y-6">

          <div class="text-5xl">😌</div>

          <h1 class="text-2xl font-semibold">
            Payment cancelled
          </h1>

          <p class="text-gray-600">
            No worries! Your payment was cancelled and no charges were made.
          </p>

          <p v-if="isLoggedIn" class="text-sm text-gray-500">
            If you’d like to try again, please choose a plan below.
          </p>

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

          <NuxtLink to="/levels" class="block pt-4 text-sm text-gray-500 hover:underline">
            Continue learning without upgrading
          </NuxtLink>

          <p class="text-sm text-gray-400 pt-4">
            You can safely close this page.
          </p>

        </div>
      </div>
    </div>
  </main>
</template>
