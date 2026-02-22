<script setup lang="ts">
import { logout } from '@/composables/useAuth'
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
  <header>
    <!-- Top Bar -->
    <div class=" max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
    <!-- Logo -->
    <NuxtLink to="/" class="text-2xl font-bold text-primary-600 hover:text-gray-600">
      TaroTea
    </NuxtLink>
    </div>
  </header>
</template>

<style></style>