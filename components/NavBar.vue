<script setup lang="ts">
import { loginWithGoogle, logout } from '@/composables/useAuth'
import { useMeStateV2 } from '@/composables/useMeStateV2'

const {
  authReady,
  isLoggedIn,
  user,
  entitlement,
  resolve
} = useMeStateV2()

const mobileOpen = ref(false)

function toggleMobile() {
  mobileOpen.value = !mobileOpen.value
}

async function handleLogout() {
  await logout()
  await resolve({ force: true }) // 🔑 re-sync global auth state
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

        <!-- Wait until auth is resolved -->
        <template v-if="!authReady">
          <span class="text-gray-400">…</span>
        </template>

        <template v-else-if="isLoggedIn">
          <NuxtLink v-if="entitlement?.plan === 'free'" to="/upgrade" class="nav-link">
            Upgrade
          </NuxtLink>

          <NuxtLink to="/account" class="nav-link">
            Account
          </NuxtLink>

          <button class="text-red-600 hover:underline" @click="handleLogout">
            Log out
          </button>
        </template>

        <button v-else class="text-blue-600 hover:underline" @click="loginWithGoogle">
          Login
        </button>
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
        <template v-if="!authReady">
          <div class="text-gray-400">Loading…</div>
        </template>

        <template v-else-if="isLoggedIn">
          <NuxtLink v-if="entitlement?.plan === 'free'" to="/upgrade" class="mobile-secondary"
            @click="mobileOpen = false">
            Upgrade
          </NuxtLink>

          <NuxtLink to="/account" class="mobile-secondary" @click="mobileOpen = false">
            Account
          </NuxtLink>

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
</template>
