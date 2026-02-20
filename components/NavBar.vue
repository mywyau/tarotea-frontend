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
  await resolve({ force: true }) // re-sync global auth state
}

onMounted(() => {
  resolve({ force: true })
})
</script>

<template>

  <header class="border-b bg-white shadow-sm">

    <div class="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">

      <!-- Logo -->
      <NuxtLink to="/" class="text-2xl font-bold text-primary-600 hover:text-gray-600">
        TaroTea
      </NuxtLink>

      <!-- Desktop nav -->

      <nav class="hidden md:flex items-center gap-6">



        <NuxtLink v-if="isLoggedIn" to="/daily/v2" class="nav-link hover:text-gray-600">Daily V2</NuxtLink>
        <NuxtLink v-if="isLoggedIn" to="/daily" class="nav-link hover:text-gray-600">Daily</NuxtLink>
        <NuxtLink to="/topics" class="nav-link hover:text-gray-600">Topics</NuxtLink>
        <NuxtLink to="/topics/quiz" class="nav-link hover:text-gray-600">Topic Quiz</NuxtLink>
        <NuxtLink to="/levels" class="nav-link hover:text-gray-600">Levels</NuxtLink>
        <NuxtLink to="/quiz" class="nav-link hover:text-gray-600">Level Quiz</NuxtLink>

        <!-- <NuxtLink to="/exercises" class="nav-link hover:text-gray-600">
          Exercises
        </NuxtLink> -->

        <!-- Wait until auth is resolved -->
        <template v-if="!authReady">
          <span class="text-gray-400">…</span>
        </template>

        <template v-else-if="isLoggedIn">

          <NuxtLink v-if="entitlement?.plan === 'free' || entitlement?.subscription_status != 'active'" to="/upgrade"
            class="font-medium bg-clip-text text-transparent
         bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500
         hover:from-pink-700 hover:via-purple-700 hover:to-indigo-700
         transition
         hover:scale-105 hover:saturate-150">
            Upgrade
          </NuxtLink>

          <div>
            <NuxtLink v-if="isLoggedIn" to="/stats" class="mobile-primary">
              Stats
            </NuxtLink>
          </div>

          <NuxtLink to="/account" class="nav-link hover:text-gray-600">
            Account
          </NuxtLink>

          <button class="text-red-600 hover:text-red-400" @click="handleLogout">
            Log out
          </button>
        </template>

        <button v-else class="text-blue-600 hover:text-blue-400" @click="loginWithGoogle">
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

      <div>
        <NuxtLink v-if="isLoggedIn" to="/daily/v2" class="mobile-primary">
          Daily V2
        </NuxtLink>
      </div>

      <div v-if="isLoggedIn" class="border-t pt-2"></div>

      <div>
        <NuxtLink v-if="isLoggedIn" to="/daily" class="mobile-primary">
          Daily
        </NuxtLink>
      </div>

      <div v-if="isLoggedIn" class="border-t pt-2"></div>

      <div>
        <NuxtLink to="/topics" class="mobile-primary">
          Topics
        </NuxtLink>
      </div>

      <div class="border-t pt-2"></div>

      <div>
        <NuxtLink to="/topics/quiz" class="mobile-primary">
          Topic Quiz
        </NuxtLink>
      </div>

      <div class="border-t pt-2"></div>

      <div>
        <NuxtLink to="/levels" class="mobile-primary" @click="mobileOpen = false">
          Levels
        </NuxtLink>
      </div>

      <div class="border-t pt-2"></div>

      <div>
        <NuxtLink to="/quiz" class="mobile-primary" @click="mobileOpen = false">
          Level Quiz
        </NuxtLink>
      </div>

      <!-- Account / upgrade -->
      <ClientOnly>
        <template v-if="!authReady">
          <div class="text-gray-400">Loading…</div>
        </template>

        <template v-else-if="isLoggedIn">

          <!-- Divider -->
          <div v-if="entitlement?.plan === 'free' || entitlement?.subscription_status != 'active'"
            class="border-t pt-2"></div>

          <div>
            <NuxtLink v-if="entitlement?.plan === 'free' || entitlement?.subscription_status != 'active'" to="/upgrade"
              class="mobile-secondary font-medium bg-clip-text text-transparent
         bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600
         hover:from-pink-700 hover:via-purple-700 hover:to-indigo-700
         transition
         hover:scale-105 hover:saturate-150" @click="mobileOpen = false">
              Upgrade
            </NuxtLink>
          </div>

          <div class="border-t pt-2"></div>


          <div>
            <NuxtLink v-if="isLoggedIn" to="/stats" class="mobile-primary">
              Stats
            </NuxtLink>
          </div>

          <div v-if="isLoggedIn" class="border-t pt-2"></div>

          <div>
            <NuxtLink to="/account" class="mobile-secondary" @click="mobileOpen = false">
              Account
            </NuxtLink>
          </div>

          <div class="border-t pt-2"></div>

          <button class="mobile-danger text-red-600 hover:text-red-400" @click="handleLogout">
            Log out
          </button>
        </template>

        <div v-else>
          <div class="border-t pt-6"></div>
          <button class="mobile-secondary text-blue-600 hover:text-blue-400" @click="loginWithGoogle">
            Login
          </button>
        </div>

      </ClientOnly>
    </div>

  </header>
</template>
