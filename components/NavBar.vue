<script setup lang="ts">
import { logout, loginWithGoogle } from '@/composables/useAuth'
import { useUpgrade } from '@/composables/useUpgrade'
import { useMeState } from '@/composables/useMeState'

const { me, authReady, refresh } = useMeState()

function upgrade(billing: 'monthly' | 'yearly') {
  useUpgrade(billing)
}

async function handleLogout() {
  await logout()
  me.value = null
}

onMounted(() => {
  refresh()
})
</script>

<template>
  <header class="border-b bg-white shadow-sm py-3">
    <div class="max-w-5xl mx-auto flex justify-between items-center px-4">

      <NuxtLink to="/" class="text-2xl font-bold text-primary-600">
        TaroTea
      </NuxtLink>

      <div class="flex items-center gap-6">

        <NuxtLink to="/levels" class="text-l text-primary-600">
          Levels
        </NuxtLink>

        <!-- Upgrade -->
        <button
          v-if="authReady && me && me.plan !== 'pro'"
          class="text-sm px-3 py-1 rounded bg-green-600 text-white"
          @click="upgrade('monthly')"
        >
          Upgrade
        </button>

        <!-- Login -->
        <button
          v-if="authReady && !me"
          class="text-blue-600 hover:underline"
          @click="loginWithGoogle"
        >
          Login
        </button>

        <!-- Logout -->
        <button
          v-if="authReady && me"
          class="text-red-600 hover:underline"
          @click="handleLogout"
        >
          Log out
        </button>

      </div>
    </div>
  </header>
</template>
