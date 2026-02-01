<script setup lang="ts">
import { loginWithGoogle, logout } from '@/composables/useAuth'
import { useNavAuth } from '@/composables/useNavAuth'
import { useUpgrade } from '@/composables/useUpgrade'

// const { me, authReady, refresh } = useMeState()

const { me, authReady, status, refresh } = useNavAuth()

function upgrade(billing: 'monthly' | 'yearly') {
  useUpgrade(billing)
}

async function handleLogout() {
  await logout()
  me.value = null
}

</script>

<template>
  <header class="border-b bg-white shadow-sm py-3">
    <div class="max-w-5xl mx-auto flex justify-between items-center px-4">

      <NuxtLink to="/" class="text-2xl font-bold text-primary-60 hover:text-gray-500">
        TaroTea
      </NuxtLink>

      <!-- Right side -->

      <div class="flex items-center gap-6">

        <NuxtLink to="/levels" class="text-l text-primary-600">
          Levels
        </NuxtLink>

        <NuxtLink to="/quiz" class="text-l text-primary-600">
          Quiz
        </NuxtLink>

        <ClientOnly>
          <template v-if="status === 'loading'">
            <span class="text-sm text-gray-400">Loading…</span>
          </template>

          <template v-else-if="status === 'logged-in'">
            <NuxtLink v-if="me && me.plan !== 'monthly' && me.plan !== 'yearly'" to="/upgrade"
              class="text-l text-primary-600">
              Upgrade
            </NuxtLink>

            <NuxtLink to="/account" class="text-l text-primary-600">
              Account
            </NuxtLink>

            <span class="text-sm text-gray-700">
              {{ me.email }}
            </span>

            <button class="text-red-600 hover:underline" @click="handleLogout">
              Log out
            </button>
          </template>

          <button v-else class="text-blue-600 hover:underline" @click="loginWithGoogle">
            Login
          </button>
        </ClientOnly>
      </div>

    </div>
  </header>
</template>
