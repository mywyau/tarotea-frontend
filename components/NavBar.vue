<script setup lang="ts">
import { loginWithGoogle, logout } from '@/composables/useAuth'
import { useMeStateV2 } from '@/composables/useMeStateV2'

const { isLoggedIn, entitlement, resolve } = useMeStateV2()

const mobileOpen = ref(false)

function toggleMobile() {
  mobileOpen.value = !mobileOpen.value
}

function closeMobile() {
  mobileOpen.value = false
}

async function handleLogout() {
  await logout()
  await resolve({ force: true })
  closeMobile()
}

onMounted(() => {
  resolve({ force: true })
})
</script>

<template>
  <header class="border-b bg-white shadow-sm">

    <!-- Top Bar -->
    <div class="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">

      <!-- Logo -->
      <NuxtLink to="/" class="text-2xl font-bold text-primary-600 hover:text-gray-600">
        TaroTea
      </NuxtLink>

      <!-- Desktop Navigation -->
      <nav class="hidden md:flex items-center gap-6">

        <NuxtLink v-if="isLoggedIn" to="/daily/v3" class="nav-link hover:text-gray-600">
          Daily
        </NuxtLink>

        <NuxtLink to="/topics" class="nav-link hover:text-gray-600">Topics</NuxtLink>
        <NuxtLink to="/topics/quiz" class="nav-link hover:text-gray-600">Topic Quiz</NuxtLink>
        <NuxtLink to="/levels" class="nav-link hover:text-gray-600">Levels</NuxtLink>
        <NuxtLink to="/quiz" class="nav-link hover:text-gray-600">Level Quiz</NuxtLink>

        <!-- Logged In Desktop -->
        <template v-if="isLoggedIn">

          <NuxtLink v-if="entitlement?.plan === 'free' || entitlement?.subscription_status !== 'active'" to="/upgrade"
            class="font-medium bg-clip-text text-transparent
                   bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500
                   hover:from-pink-700 hover:via-purple-700 hover:to-indigo-700
                   transition hover:scale-105 hover:saturate-150">
            Upgrade
          </NuxtLink>

          <NuxtLink to="/stats" class="nav-link hover:text-gray-600">
            Stats
          </NuxtLink>

          <NuxtLink to="/account" class="nav-link hover:text-gray-600">
            Account
          </NuxtLink>

          <button type="button" class="text-red-600 hover:text-red-400" @click="handleLogout">
            Log out
          </button>
        </template>

        <!-- Logged Out Desktop -->
        <button v-else type="button" class="text-blue-600 hover:text-blue-400" @click="loginWithGoogle">
          Login
        </button>

      </nav>

      <!-- Mobile Hamburger -->
      <button type="button" class="md:hidden text-2xl relative z-50 shrink-0" @click="toggleMobile"
        aria-label="Toggle menu">
        ☰
      </button>

    </div>

    <!-- Mobile Menu -->
    <div v-if="mobileOpen" class="md:hidden border-t bg-white px-4 py-5 divide-gray-200">

      <!-- Primary Links -->
      <div class="space-y-4 py-4">

        <NuxtLink v-if="isLoggedIn" to="/daily/v3" class="mobile-primary block" @click="closeMobile">
          Daily
        </NuxtLink>

        <NuxtLink to="/topics" class="mobile-primary block" @click="closeMobile">
          Topics
        </NuxtLink>

        <NuxtLink to="/topics/quiz" class="mobile-primary block" @click="closeMobile">
          Topic Quiz
        </NuxtLink>

        <NuxtLink to="/levels" class="mobile-primary block" @click="closeMobile">
          Levels
        </NuxtLink>

        <NuxtLink to="/quiz" class="mobile-primary block" @click="closeMobile">
          Level Quiz
        </NuxtLink>

      </div>

      <!-- Account Section -->
      <div class="space-y-4 py-4">

        <template v-if="isLoggedIn">

          <NuxtLink v-if="entitlement?.plan === 'free' || entitlement?.subscription_status !== 'active'" to="/upgrade"
            class="mobile-secondary font-medium block bg-clip-text text-transparent
               bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600
               hover:from-pink-700 hover:via-purple-700 hover:to-indigo-700
               transition hover:scale-105 hover:saturate-150" @click="closeMobile">
            Upgrade
          </NuxtLink>

          <NuxtLink to="/stats" class="mobile-primary block" @click="closeMobile">
            Stats
          </NuxtLink>

          <NuxtLink to="/account" class="mobile-secondary block" @click="closeMobile">
            Account
          </NuxtLink>

          <button type="button" class="mobile-danger text-red-600 hover:text-red-400 block text-left w-full"
            @click="handleLogout">
            Log out
          </button>

        </template>

        <template v-else>
          <button type="button" class="mobile-secondary text-blue-600 hover:text-blue-400 block text-left w-full"
            @click="loginWithGoogle">
            Login
          </button>
        </template>

      </div>

    </div>

  </header>
</template>

<style>


</style>