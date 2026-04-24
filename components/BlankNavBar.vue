<script setup lang="ts">
import { login, logout } from '@/composables/useAuth'
import { useMeStateV2 } from '@/composables/useMeStateV2'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const { isLoggedIn, resolve } = useMeStateV2()
const route = useRoute()

const menuOpen = ref(false)
const navOpen = ref(false)
const menuRoot = ref<HTMLElement | null>(null)
const navRoot = ref<HTMLElement | null>(null)

const navLinks = computed(() => {
  const links = [
    { to: '/', label: 'Home', requiresAuth: false },
    { to: '/daily/vocab/v2', label: 'Daily Quiz', requiresAuth: true },
    { to: '/daily/jyutping/v2', label: 'Daily Jyutping Quiz', requiresAuth: true },
    { to: '/levels', label: 'Levels', requiresAuth: false },
    { to: '/quiz', label: 'Level Quiz', requiresAuth: false },
    { to: '/dojo/level', label: 'Level Dojo', requiresAuth: false },
    { to: '/topics', label: 'Topics', requiresAuth: false },
    { to: '/topics/quiz', label: 'Topic Quiz', requiresAuth: false },
    { to: '/dojo/topic', label: 'Topic Dojo', requiresAuth: false },
  ]

  return links.filter(link => !link.requiresAuth || isLoggedIn.value)
})

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}
function closeMenu() {
  menuOpen.value = false
}

function toggleNav() {
  navOpen.value = !navOpen.value
}
function closeNav() {
  navOpen.value = false
}

async function handleLogout() {
  await logout()
  await resolve({ force: true })
  closeMenu()
}

function onDocumentClick(e: MouseEvent) {
  const target = e.target as Node | null
  if (menuOpen.value && menuRoot.value && target && !menuRoot.value.contains(target)) {
    closeMenu()
  }
  if (navOpen.value && navRoot.value && target && !navRoot.value.contains(target)) {
    closeNav()
  }
}

function onDocumentKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  closeMenu()
  closeNav()
}

onMounted(() => {
  resolve({ force: true })
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
})

watch(() => route.fullPath, () => {
  closeMenu()
  closeNav()
})
</script>

<template>
  <header class="header-shell sticky top-0 z-40">
    <div class="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
      <NuxtLink to="/" class="text-2xl font-bold text-black hover:text-gray-700">
        TaroTea
      </NuxtLink>

      <div ref="menuRoot" class="relative">
        <button type="button" class="menu-btn" @click.stop="toggleMenu" aria-label="Open account menu"
          :aria-expanded="menuOpen ? 'true' : 'false'">
          ☰
        </button>

        <div v-if="menuOpen" class="menu-panel">
          <template v-if="isLoggedIn">
            <NuxtLink to="/account/v2"
              class="w-full flex items-center rounded-xl px-3 py-2 text-sm text-black hover:bg-black/5 transition"
              @click="closeMenu">
              Account
            </NuxtLink>

            <NuxtLink to="/stats/v2"
              class="w-full flex items-center rounded-xl px-3 py-2 text-sm text-black hover:bg-black/5 transition"
              @click="closeMenu">
              Stats
            </NuxtLink>

            <NuxtLink to="/upgrade"
              class="w-full flex items-center rounded-xl px-3 py-2 text-sm font-semibold hover:bg-black hover:brightness-125 transition"
              @click="closeMenu">

              <span
                class="bg-gradient-to-r from-[#d48fd0] via-[#b57bc3] via-[#6faed6] to-[#d48fd0] bg-clip-text text-transparent">
                Upgrade
              </span>
            </NuxtLink>

            <div class="h-px my-2 bg-black/10"></div>

            <button type="button"
              class="w-full flex items-center rounded-xl px-3 py-2 text-sm text-red-700 hover:bg-red-500/10 transition"
              @click="handleLogout">
              Log out
            </button>
          </template>

          <template v-else>
            <button type="button"
              class="w-full flex items-center rounded-xl px-3 py-2 text-sm text-gray-900 hover:bg-black/5 transition"
              @click="login()">
              Login
            </button>
          </template>
        </div>
      </div>
    </div>


    <button type="button" class="side-rail-trigger" @click="toggleNav" :class="{ 'is-open': navOpen }"
      :style="{ left: navOpen ? 'min(20rem, 88vw)' : '1.0rem' }"
      :aria-label="navOpen ? 'Close navigation panel' : 'Open navigation panel'"
      :aria-expanded="navOpen ? 'true' : 'false'" aria-controls="warp-navigation-panel">
      <span class="sr-only">{{ navOpen ? "Close navigation panel" : "Open navigation panel" }}</span>
    </button>

    <div v-if="!navOpen" class="nav-drawer-peek" aria-hidden="true" />

    <transition name="fade">
      <button v-if="navOpen" type="button" class="drawer-overlay" aria-label="Close navigation panel" @click="closeNav" />
    </transition>

    <transition name="slide-left">
      <aside v-if="navOpen" id="warp-navigation-panel" ref="navRoot" class="nav-drawer" aria-label="Main navigation panel">
        <div class="px-4 py-4 border-b border-black/20">
          <span class="font-semibold text-black">Warp</span>
        </div>

        <nav class="px-3 py-4 space-y-1">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="drawer-link font-medium"
            :class="{ 'drawer-link-active': route.path === link.to }"
            :aria-current="route.path === link.to ? 'page' : undefined"
            @click="closeNav"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>
      </aside>
    </transition>
  </header>
</template>

<style scoped>
.header-shell {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;
}

.menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 40px;
  font-size: 26px;
}

.menu-btn:active {
  transform: scale(0.98);
}


.side-rail-trigger {
  position: fixed;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 70;
  min-height: 10rem;
  width: 0.9rem;
  border-top-right-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
  background: rgba(88, 199, 95, 0.45);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.22);
  transition: width 140ms ease, background 140ms ease, left 180ms ease, opacity 140ms ease;
}


.side-rail-trigger.is-open {
  width: 0.95rem;
  border-top-right-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
}

.side-rail-trigger:hover {
  width: 0.95rem;
  background: rgba(105, 199, 112, 0.62);
}

.nav-drawer-peek {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 55;
  height: 100vh;
  width: 1.0rem;
  background: rgba(111, 92, 202, 0.45);
  pointer-events: none;
}

.menu-panel {
  position: absolute;
  right: 0;
  margin-top: 10px;
  width: 220px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.12);
  padding: 10px;
  z-index: 60;
}

.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  pointer-events: auto;
  background: rgba(246, 225, 225, 0.22);
  border: 0;
  padding: 0;
  cursor: default;
}

.nav-drawer {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 60;
  height: 100vh;
  width: min(20rem, 88vw);
  background: rgba(111, 92, 202, 0.35);
  backdrop-filter: blur(8px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.12);
}

.drawer-link {
  display: flex;
  border-radius: 0.75rem;
  padding: 0.65rem 0.75rem;
  font-size: 0.95rem;
  color: #111827;
  transition: background 120ms ease;
}

.drawer-link:hover {
  background: rgba(0, 0, 0, 0.06);
}

.drawer-link-active {
  background: rgba(255, 255, 255, 0.5);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.22s ease;
}

.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
}
</style>
