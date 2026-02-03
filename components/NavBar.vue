<script setup lang="ts">
import { loginWithGoogle, logout } from '@/composables/useAuth'
import { useNavAuth } from '@/composables/useNavAuth'
import { useUpgrade } from '@/composables/useUpgrade'

const { me, authReady, status, refresh } = useNavAuth()

function upgrade(billing: 'monthly' | 'yearly') {
  useUpgrade(billing)
}

async function handleLogout() {
  await logout()
  me.value = null
}

const mobileOpen = ref(false)

function toggleMobile() {
  mobileOpen.value = !mobileOpen.value
}

</script>

<template>

  <header class="border-b bg-white shadow-sm">
    <div class="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">

      <!-- Logo -->
      <NuxtLink to="/" class="text-2xl font-bold text-primary-600">
        TaroTea
      </NuxtLink>

      <!-- Desktop nav -->
      <nav class="hidden md:flex items-center gap-6">
        <NuxtLink to="/levels" class="nav-link">Levels</NuxtLink>
        <NuxtLink to="/quiz" class="nav-link">Quiz</NuxtLink>

        <ClientOnly>
          <template v-if="status === 'logged-in'">
            <NuxtLink v-if="me && me.plan !== 'monthly' && me.plan !== 'yearly'" to="/upgrade" class="nav-link">
              Upgrade
            </NuxtLink>

            <NuxtLink to="/account" class="nav-link">Account</NuxtLink>

            <button class="text-red-600 hover:underline" @click="handleLogout">
              Log out
            </button>
          </template>

          <button v-else class="text-blue-600 hover:underline" @click="loginWithGoogle">
            Login
          </button>
        </ClientOnly>
      </nav>

      <!-- Mobile menu button -->
      <button class="md:hidden text-2xl" @click="toggleMobile" aria-label="Open menu">
        ☰
      </button>

    </div>

    <!-- Mobile menu -->
    <div v-if="mobileOpen" class="md:hidden border-t bg-white px-4 py-5 space-y-4">
      <!-- Primary nav -->
      <div class="">
        <NuxtLink to="/levels" class="mobile-primary" @click="mobileOpen = false">
          Levels
        </NuxtLink>
      </div>

      <div class="border-t pt-2"></div>

      <div class="">
        <NuxtLink to="/quiz" class="mobile-primary" @click="mobileOpen = false">
          Quiz
        </NuxtLink>

      </div>

      <!-- Divider -->
      <div class="border-t pt-2"></div>

      <!-- Account / upgrade -->
      <ClientOnly>
        <template v-if="status === 'logged-in'">
          <div class="space-y-3">
            <NuxtLink v-if="me && me.plan !== 'monthly' && me.plan !== 'yearly'" to="/upgrade"
              class="mobile-secondary font-medium" @click="mobileOpen = false">
              Upgrade
            </NuxtLink>

            <NuxtLink to="/account" class="mobile-secondary" @click="mobileOpen = false">
              Account
            </NuxtLink>
          </div>

          <!-- Divider -->
          <div class="border-t pt-4"></div>

          <!-- Logout -->
          <button class="mobile-danger" @click="handleLogout">
            Log out
          </button>
        </template>

        <button v-else class="mobile-secondary" @click="loginWithGoogle">
          Login
        </button>
      </ClientOnly>
    </div>

  </header>


  <!-- <header class="border-b bg-white shadow-sm py-3">
    <div class="max-w-5xl mx-auto flex justify-between items-center px-4"> -->

  <!-- <NuxtLink to="/" class="text-2xl font-bold text-primary-60 hover:text-gray-500">
        TaroTea
      </NuxtLink> -->

  <!-- Right side -->

  <!-- <div class="flex items-center gap-6"> -->

  <!-- <NuxtLink to="/levels" class="text-l text-primary-600">
          Levels
        </NuxtLink>

        <NuxtLink to="/quiz" class="text-l text-primary-600">
          Quiz
        </NuxtLink> -->

  <!-- <ClientOnly>
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
        </ClientOnly> -->
  <!-- </div> -->

  <!-- </div> -->
  <!-- </header> -->
</template>
