<script setup lang="ts">
import { login, logout } from '@/composables/useAuth'
import { useMeStateV2 } from '@/composables/useMeStateV2'
import { computed, onMounted, ref, watch } from 'vue'

const route = useRoute()
const { isLoggedIn, entitlement, resolve } = useMeStateV2()

const mobileOpen = ref(false)

const primaryLinks = computed(() => [
  ...(isLoggedIn.value ? [{ to: '/daily/vocab/v2', label: 'Daily' }] : []),
  { to: '/dojo', label: 'Dojo' },
  { to: '/levels', label: 'Levels' },
  { to: '/quiz', label: 'Level Quiz' },
  { to: '/topics', label: 'Topics' },
  { to: '/topics/quiz', label: 'Topic Quiz' },
])

const accountLinks = computed(() => [
  { to: '/account/v2', label: 'Account' },
  { to: '/stats/v2', label: 'Stats' },
])

const showUpgrade = computed(() => isLoggedIn.value
  && (entitlement.value?.plan === 'free' || entitlement.value?.subscription_status !== 'active'))

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

watch(() => route.fullPath, () => {
  closeMobile()
})

onMounted(() => {
  resolve({ force: true })
})
</script>

<template>
  <header class="sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
    <div class="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
      <NuxtLink to="/" class="text-2xl font-semibold tracking-tight text-black hover:text-black/70">
        TaroTea
      </NuxtLink>

      <nav class="hidden items-center gap-5 md:flex">
        <NuxtLink v-for="link in primaryLinks" :key="link.to" :to="link.to" class="text-sm text-black transition hover:text-black/70">
          {{ link.label }}
        </NuxtLink>

        <template v-if="isLoggedIn">
          <NuxtLink v-for="link in accountLinks" :key="link.to" :to="link.to" class="text-sm text-black transition hover:text-black/70">
            {{ link.label }}
          </NuxtLink>

          <NuxtLink
            v-if="showUpgrade"
            to="/upgrade"
            class="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-sm font-semibold text-transparent transition hover:brightness-90"
          >
            Upgrade
          </NuxtLink>

          <button type="button" class="text-sm text-red-700 transition hover:text-red-500" @click="handleLogout">
            Log out
          </button>
        </template>

        <button v-else type="button" class="text-sm text-blue-700 transition hover:text-blue-500" @click="login()">
          Login
        </button>
      </nav>

      <button
        type="button"
        class="text-2xl md:hidden"
        aria-label="Toggle mobile menu"
        :aria-expanded="mobileOpen ? 'true' : 'false'"
        @click="toggleMobile"
      >
        ☰
      </button>
    </div>

    <div v-if="mobileOpen" class="border-t bg-white px-4 py-4 md:hidden">
      <div class="space-y-2">
        <NuxtLink
          v-for="link in primaryLinks"
          :key="`mobile-${link.to}`"
          :to="link.to"
          class="block rounded-lg px-3 py-2 text-sm text-black transition hover:bg-black/5"
          @click="closeMobile"
        >
          {{ link.label }}
        </NuxtLink>
      </div>

      <div class="mt-4 border-t pt-4">
        <template v-if="isLoggedIn">
          <NuxtLink
            v-for="link in accountLinks"
            :key="`mobile-account-${link.to}`"
            :to="link.to"
            class="block rounded-lg px-3 py-2 text-sm text-black transition hover:bg-black/5"
            @click="closeMobile"
          >
            {{ link.label }}
          </NuxtLink>

          <NuxtLink
            v-if="showUpgrade"
            to="/upgrade"
            class="block rounded-lg bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text px-3 py-2 text-sm font-semibold text-transparent transition hover:brightness-90"
            @click="closeMobile"
          >
            Upgrade
          </NuxtLink>

          <button
            type="button"
            class="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 transition hover:bg-red-500/10"
            @click="handleLogout"
          >
            Log out
          </button>
        </template>

        <button
          v-else
          type="button"
          class="block w-full rounded-lg px-3 py-2 text-left text-sm text-blue-700 transition hover:bg-blue-500/10"
          @click="login()"
        >
          Login
        </button>
      </div>
    </div>
  </header>
</template>
