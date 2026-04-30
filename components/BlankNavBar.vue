<script setup lang="ts">
import { login, logout } from '@/composables/useAuth'
import { useMeStateV2 } from '@/composables/useMeStateV2'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const { isLoggedIn, resolve } = useMeStateV2()
const route = useRoute()

const menuOpen = ref(false)
const navOpen = ref(false)
const menuRoot = ref<HTMLElement | null>(null)
const isTriggerHidden = ref(false)

const navLinks = computed(() => {
  const links = [
    { to: '/', label: 'Home', requiresAuth: false },
    { to: '/daily/vocab/v2/start-quiz', label: 'Daily Quiz', requiresAuth: true },
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
function toggleTriggerVisibility() {
  isTriggerHidden.value = !isTriggerHidden.value
  if (isTriggerHidden.value) closeNav()
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
}

function onDocumentKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  closeMenu()
  closeNav()
}

onMounted(() => {
  resolve()
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
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


    <button v-if="!isTriggerHidden" type="button" class="side-rail-trigger" @click.stop="toggleNav"
      :class="{ 'is-open': navOpen }"
      :style="{ left: navOpen ? 'min(20rem, 88vw)' : '1.0rem' }"
      :aria-label="navOpen ? 'Close navigation panel' : 'Open navigation panel'"
      :aria-expanded="navOpen ? 'true' : 'false'" aria-controls="warp-navigation-panel">
      <span class="portal-ring portal-ring-outer" aria-hidden="true"></span>
      <span class="portal-ring portal-ring-inner" aria-hidden="true"></span>
      <span class="portal-core" aria-hidden="true"></span>
      <span class="sr-only">{{ navOpen ? "Close navigation panel" : "Open navigation panel" }}</span>
    </button>

    <div v-if="!navOpen && !isTriggerHidden" class="nav-drawer-peek" aria-hidden="true" />

    <button
      type="button"
      class="trigger-visibility-btn"
      :aria-label="isTriggerHidden ? 'Show Warp trigger' : 'Hide Warp trigger'"
      @click="toggleTriggerVisibility"
    >
      {{ isTriggerHidden ? 'Show Warp' : 'Hide Warp' }}
    </button>

    <transition name="fade">
      <div v-if="navOpen" class="drawer-overlay" />
    </transition>

    <transition name="slide-left">
      <aside v-if="navOpen" id="warp-navigation-panel" class="nav-drawer" aria-label="Main navigation panel">
        <div class="px-4 py-4 border-b border-black/20">
          <span class="text-xl font-semibold text-black">Warp</span>
        </div>

        <nav class="px-3 py-4 space-y-1">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="drawer-link font-medium"
            :class="{ 'drawer-link-active': route.path === link.to }"
            :aria-current="route.path === link.to ? 'page' : undefined"
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
  left: 0.2rem;
  top: 50%;
  transform: translateY(-50%);
  z-index: 70;
  height: 3.4rem;
  width: 3.4rem;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.42), rgba(117, 76, 196, 0.68) 40%, rgba(49, 29, 117, 0.92) 100%);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 3px rgba(217, 193, 255, 0.28), 0 8px 24px rgba(18, 11, 48, 0.5);
  overflow: hidden;
  isolation: isolate;
  transition: transform 180ms ease, box-shadow 180ms ease, left 180ms ease, opacity 140ms ease;
}

.side-rail-trigger::before {
  content: '';
  position: absolute;
  inset: -35%;
  border-radius: inherit;
  background: conic-gradient(from 0deg, rgba(191, 155, 255, 0), rgba(191, 155, 255, 0.82), rgba(117, 213, 255, 0.15), rgba(191, 155, 255, 0));
  animation: portalSwirl 2.8s linear infinite;
  opacity: 0.75;
  filter: blur(0.6px);
}

.side-rail-trigger:hover,
.side-rail-trigger.is-open {
  transform: translateY(-50%) scale(1.04);
  box-shadow: 0 0 0 3px rgba(217, 193, 255, 0.4), 0 10px 28px rgba(24, 13, 64, 0.6);
}

.portal-ring {
  position: absolute;
  border-radius: 999px;
  border: 1.25px solid rgba(239, 229, 255, 0.65);
  mix-blend-mode: screen;
}

.portal-ring-outer {
  inset: 0.45rem;
  animation: ringSpin 1.8s linear infinite;
}

.portal-ring-inner {
  inset: 0.9rem;
  border-color: rgba(130, 225, 255, 0.8);
  animation: ringSpinReverse 1.15s linear infinite;
}

.portal-core {
  position: absolute;
  inset: 1.25rem;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(133, 245, 255, 0.95), rgba(105, 69, 204, 0.85) 70%, rgba(105, 69, 204, 0.15));
  box-shadow: 0 0 16px rgba(133, 245, 255, 0.7);
  animation: pulseCore 1.5s ease-in-out infinite;
}

.nav-drawer-peek {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 55;
  height: 100vh;
  width: 1rem;
  background: rgba(111, 92, 202, 0.45);
  pointer-events: none;
}

.trigger-visibility-btn {
  position: fixed;
  left: 0.75rem;
  bottom: 0.75rem;
  z-index: 75;
  border-radius: 0.6rem;
  background: rgba(17, 24, 39, 0.82);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  padding: 0.55rem 0.7rem;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
}

@media (min-width: 768px) {
  .side-rail-trigger {
    left: 0.2rem;
    height: 3.8rem;
    width: 3.8rem;
  }

  .nav-drawer-peek {
    width: 1rem;
  }
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
  pointer-events: none;
  background: rgba(246, 225, 225, 0.22);
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

@keyframes portalSwirl {
  to { transform: rotate(360deg); }
}

@keyframes ringSpin {
  to { transform: rotate(360deg); }
}

@keyframes ringSpinReverse {
  to { transform: rotate(-360deg); }
}

@keyframes pulseCore {
  0%, 100% { transform: scale(0.9); opacity: 0.78; }
  50% { transform: scale(1.06); opacity: 1; }
}

</style>
