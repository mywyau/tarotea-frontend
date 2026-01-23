<script setup lang="ts">
import { useUpgrade } from '@/composables/useUpgrade'
import { useMeState } from '@/composables/useMeState'
import { loginWithGoogle, logout } from '@/composables/useAuth'
import { useNavAuth } from '@/composables/useNavAuth'

definePageMeta({ layout: 'default' })

const { me, authReady } = useMeState()

function upgrade(plan: 'monthly' | 'yearly') {
  useUpgrade(plan)
}
</script>

<template>
  <main class="min-h-[70vh] flex items-center justify-center px-4">
    <div class="max-w-md w-full text-center space-y-6">

      <div class="text-5xl">🍵</div>

      <h1 class="text-2xl font-semibold">
        Upgrade your plan
      </h1>

      <p class="text-gray-600">
        Unlock all levels and learn Cantonese without limits.
      </p>

      <!-- Plans -->
      <div class="space-y-3 pt-4">

        <!-- Monthly -->
        <button
          class="block w-full rounded-lg border border-gray-300 py-3 font-medium hover:bg-gray-50 transition"
          @click="upgrade('monthly')"
        >
          Monthly plan
        </button>

        <!-- Yearly -->
        <button
          class="block w-full rounded-lg bg-black text-white py-3 font-medium hover:bg-gray-800 transition"
          @click="upgrade('yearly')"
        >
          Yearly plan · Best value
        </button>

      </div>

      <!-- Secondary -->
      <NuxtLink
        to="/levels"
        class="block pt-4 text-sm text-gray-500 hover:underline"
      >
        Continue learning without upgrading
      </NuxtLink>

      <p class="text-xs text-gray-400 pt-4">
        You can change or cancel your plan at any time.
      </p>

    </div>
  </main>
</template>
