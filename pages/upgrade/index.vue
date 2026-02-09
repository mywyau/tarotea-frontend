<script setup lang="ts">
import { useUpgrade } from '@/composables/useUpgrade';

definePageMeta({ layout: 'default' })

const {
  state,
  authReady,
  isLoggedIn,
  user,
  entitlement,
  hasPaidAccess,
  isCanceling,
  currentPeriodEnd,
  resolve,
} = useMeStateV2();

const isSubscribed = computed(() =>
  authReady.value &&
  entitlement.value &&
  entitlement.value.plan !== 'free' &&
  entitlement.value.active === true
)

function upgrade(plan: 'monthly' | 'yearly') {
  if (isSubscribed.value) {
    // Already paid → manage subscription instead
    navigateTo('/account')
    return
  }

  useUpgrade(plan)
}

</script>

<template>
  <main class="min-h-[70vh] px-4 pt-20 pb-16">

    <div class="max-w-md w-full mx-auto text-center space-y-6">
      <div class="max-w-md w-full text-center space-y-6">

        <div class="text-5xl">🍵</div>

        <h1 class="text-2xl font-semibold">
          Upgrade your plan
        </h1>

        <p class="text-gray-600">
          Unlock all content and learn Cantonese without limits.
        </p>

        <ul class="text-left text-gray-700 space-y-2 max-w-sm mx-auto">
          <li>• Full access to growing content.</li>
          <li>• New topics and levels added regularly.</li>    
          <li>• Native Cantonese audio for every word</li>
          <li>• No fluff, neatly organised content</li>
          <li>• New content added regularly</li>
          <li>• Randomised exercises and tests</li>
        </ul>

        <!-- Plans -->
        <div v-if="isLoggedIn" class="space-y-3 pt-4">
          <!-- Monthly -->
          <button class="block w-full rounded-lg border border-gray-300 py-3 font-medium transition"
            :class="isSubscribed ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50'" :disabled="isSubscribed"
            @click="upgrade('monthly')">
            Monthly plan · £5.99
          </button>

          <!-- Yearly -->
          <button class="block w-full rounded-lg bg-black text-white py-3 font-medium transition"
            :class="isSubscribed ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-800'" :disabled="isSubscribed"
            @click="upgrade('yearly')">
            Yearly plan · £59.99 · Best value
          </button>
        </div>

        <div v-if="!isLoggedIn" class="space-y-3 pt-4">
          <!-- Monthly -->
          <p class="text-lg text-gray-600">Please login in or sign-up and upgrade</p>
        </div>

        <p v-if="isSubscribed" class="text-sm text-gray-600">
          You’re already subscribed.
          <NuxtLink to="/account" class="text-blue-600 hover:underline">
            Manage your plan
          </NuxtLink>
        </p>


        <p v-if="!isSubscribed" class="text-sm text-gray-600">
          <!-- Secondary -->
          <NuxtLink to="/levels" class="pt-4 text-sm text-gray-500 hover:underline">
           ← Continue learning without upgrading
          </NuxtLink>
        </p>

        <p class="text-xs text-gray-400 pt-4">
          You can change or cancel your plan at any time.
        </p>

      </div>
    </div>
  </main>
</template>
