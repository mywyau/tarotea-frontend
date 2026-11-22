<script setup lang="ts">
import { login, logout } from '@/composables/useAuth'
import { useMeStateV2 } from '@/composables/useMeStateV2'
import {
  AudioLines, BarChart3, CalendarCheck, CircleHelp, House, Keyboard,
  Layers, LogIn, LogOut, Menu, Sparkles, Tags, UserRound, X,
} from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getFocusedLearningExitPath } from '~/utils/navigation/focusMode'

const props = withDefaults(defineProps<{ focusMode?: boolean }>(), { focusMode: false })
const { isLoggedIn, user, resolve } = useMeStateV2()
const route = useRoute()
const router = useRouter()

const accountLabel = computed(() => user.value?.firstName || 'Account')
const accountMenuOpen = ref(false)
const navOpen = ref(false)
const accountRoot = ref<HTMLElement | null>(null)
const drawerRoot = ref<HTMLElement | null>(null)
const drawerCloseButton = ref<HTMLButtonElement | null>(null)
const lastDrawerTrigger = ref<HTMLElement | null>(null)

const { dailyPracticeEnabled } = useRuntimeConfig().public
const showDailyPractice = computed(() => dailyPracticeEnabled && isLoggedIn.value)

const primaryLinks = computed(() => [
  { to: '/levels', label: 'Levels', paths: ['/levels', '/level/'] },
  { to: '/topics', label: 'Topics', paths: ['/topics', '/topic/'], excludes: ['/topics/quiz', '/topic/quiz/'] },
  { to: '/quiz', label: 'Quizzes', paths: ['/quiz', '/topics/quiz', '/topic/quiz/'] },
  { to: '/typing-practice', label: 'Typing practice', paths: ['/typing-practice'] },
  ...(showDailyPractice.value ? [{ to: '/daily/vocab/start-quiz', label: 'Daily', paths: ['/daily/'] }] : []),
])

const mobileNavLinks = [
  { to: '/', label: 'Home', icon: House, paths: ['/'] },
  { to: '/levels', label: 'Levels', icon: Layers, paths: ['/levels', '/level/'] },
  { to: '/topics', label: 'Topics', icon: Tags, paths: ['/topics', '/topic/'], excludes: ['/topics/quiz', '/topic/quiz/'] },
  { to: '/quiz', label: 'Quizzes', icon: CircleHelp, paths: ['/quiz', '/topics/quiz', '/topic/quiz/'] },
]

const navigationGroups = computed(() => [
  {
    label: 'Learn',
    links: [
      { to: '/levels', label: 'Levels', description: 'Learn in structured stages', icon: Layers, paths: ['/levels', '/level/'] },
      { to: '/topics', label: 'Topics', description: 'Browse useful vocabulary themes', icon: Tags, paths: ['/topics', '/topic/'], excludes: ['/topics/quiz', '/topic/quiz/'] },
    ],
  },
  {
    label: 'Practice',
    links: [
      { to: '/quiz', label: 'Level quizzes', description: 'Review vocabulary, audio and sentences', icon: CircleHelp, paths: ['/quiz'] },
      { to: '/topics/quiz', label: 'Topic quizzes', description: 'Practise a vocabulary theme', icon: AudioLines, paths: ['/topics/quiz', '/topic/quiz/'] },
      { to: '/typing-practice/level', label: 'Typing practice by level', description: 'Type words and sentences at your level', icon: Keyboard },
      { to: '/typing-practice/topic', label: 'Typing practice by topic', description: 'Type vocabulary from a chosen topic', icon: Sparkles },
      ...(showDailyPractice.value ? [
        { to: '/daily/vocab/start-quiz', label: 'Daily vocabulary', description: 'Your short daily review', icon: CalendarCheck },
        { to: '/daily/jyutping', label: 'Daily Jyutping', description: 'Daily sound and tone practice', icon: AudioLines },
      ] : []),
    ],
  },
])

function isLinkActive(link: { to: string, paths?: string[], excludes?: string[] }) {
  if (link.to === '/') return route.path === '/'
  if (link.excludes?.some(path => route.path === path || route.path.startsWith(path))) return false
  return (link.paths || [link.to]).some(path => route.path === path || route.path.startsWith(path))
}

const isMoreRouteActive = computed(() => route.path.startsWith('/daily/') || isLinkActive({ to: '/typing-practice' }))

function toggleAccountMenu() {
  accountMenuOpen.value = !accountMenuOpen.value
  if (accountMenuOpen.value) closeNav(false)
}

function closeAccountMenu() {
  accountMenuOpen.value = false
}

function toggleNav(event: MouseEvent) {
  lastDrawerTrigger.value = event.currentTarget as HTMLElement
  navOpen.value ? closeNav() : openNav()
}

async function openNav() {
  closeAccountMenu()
  navOpen.value = true
  await nextTick()
  drawerCloseButton.value?.focus()
}

function closeNav(restoreFocus = true) {
  if (!navOpen.value) return
  navOpen.value = false
  if (restoreFocus) nextTick(() => lastDrawerTrigger.value?.focus())
}

async function handleLogin() {
  closeAccountMenu()
  closeNav(false)
  await login()
}

async function handleLogout() {
  await logout()
  await resolve({ force: true })
  closeAccountMenu()
  closeNav(false)
}

function exitPractice() {
  router.push(getFocusedLearningExitPath(route.path))
}

function onDocumentClick(event: MouseEvent) {
  const target = event.target as Node | null
  if (accountMenuOpen.value && accountRoot.value && target && !accountRoot.value.contains(target)) closeAccountMenu()
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  closeAccountMenu()
  closeNav()
}

function trapDrawerFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !drawerRoot.value) return
  const focusable = Array.from(drawerRoot.value.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
  ))
  if (!focusable.length) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  resolve()
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
})

watch(navOpen, open => {
  if (import.meta.client) document.body.style.overflow = open ? 'hidden' : ''
})

watch(() => route.fullPath, () => {
  closeAccountMenu()
  closeNav(false)
})

watch(() => props.focusMode, focusMode => {
  if (!focusMode) return
  closeAccountMenu()
  closeNav(false)
})
</script>

<template>
  <header class="app-header" :class="{ 'app-header-focus': props.focusMode }">
    <div class="app-header-inner">
      <NuxtLink to="/" class="brand-logo" aria-label="TaroTea home">
        <span class="brand-mark" aria-hidden="true">T</span>
        <span>TaroTea</span>
      </NuxtLink>

      <span v-if="props.focusMode" class="focus-label">Practice mode</span>
      <!-- Quiz pages can mount before Nuxt updates the shell's route. Keep the Teleport target mounted. -->
      <div v-show="props.focusMode" id="quiz-header-progress" class="quiz-header-progress-slot" />
      <button v-if="props.focusMode" type="button" class="focus-exit" @click="exitPractice">
        <span>Exit practice</span>
      </button>

      <template v-else>
        <nav class="desktop-primary-nav" aria-label="Primary navigation">
          <NuxtLink v-for="link in primaryLinks" :key="link.to" :to="link.to" class="desktop-nav-link"
            :class="{ 'desktop-nav-link-active': isLinkActive(link) }"
            :aria-current="isLinkActive(link) ? 'page' : undefined">
            {{ link.label }}
          </NuxtLink>
        </nav>

        <div class="header-actions">
          <button type="button" class="header-action header-more-action"
            :class="{ 'header-action-active': navOpen }" :aria-expanded="navOpen ? 'true' : 'false'"
            aria-controls="app-navigation-drawer" @click.stop="toggleNav">
            <Menu aria-hidden="true" />
            <span>More</span>
          </button>

          <div ref="accountRoot" class="account-root">
            <button type="button" class="header-action account-trigger"
              :class="{ 'header-action-active': accountMenuOpen }" aria-controls="account-menu"
              :aria-expanded="accountMenuOpen ? 'true' : 'false'"
              :aria-label="isLoggedIn ? `Open ${accountLabel} account menu` : 'Open sign in menu'"
              @click.stop="toggleAccountMenu">
              <UserRound aria-hidden="true" />
              <span class="account-trigger-label">{{ isLoggedIn ? accountLabel : 'Sign in' }}</span>
            </button>

            <div v-if="accountMenuOpen" id="account-menu" class="account-menu" role="menu">
              <template v-if="isLoggedIn">
                <div class="account-menu-heading">
                  <span class="account-avatar" aria-hidden="true">{{ accountLabel.charAt(0).toUpperCase() }}</span>
                  <span><strong>{{ accountLabel }}</strong><small>Your learning space</small></span>
                </div>
                <NuxtLink to="/account" class="account-menu-link" role="menuitem" @click="closeAccountMenu">
                  <UserRound aria-hidden="true" /> Account
                </NuxtLink>
                <NuxtLink to="/stats" class="account-menu-link" role="menuitem" @click="closeAccountMenu">
                  <BarChart3 aria-hidden="true" /> Stats
                </NuxtLink>
                <NuxtLink to="/upgrade" class="account-menu-link account-menu-upgrade" role="menuitem" @click="closeAccountMenu">
                  <Sparkles aria-hidden="true" /> Upgrade
                </NuxtLink>
                <div class="account-menu-divider" />
                <button type="button" class="account-menu-link account-menu-danger" role="menuitem" @click="handleLogout">
                  <LogOut aria-hidden="true" /> Log out
                </button>
              </template>
              <template v-else>
                <p class="account-menu-message">Sign in to save your progress and build a streak.</p>
                <button type="button" class="account-sign-in" role="menuitem" @click="handleLogin">
                  <LogIn aria-hidden="true" /> Sign in
                </button>
              </template>
            </div>
          </div>
        </div>
      </template>
    </div>
  </header>

  <template v-if="!props.focusMode">
      <transition name="nav-fade">
        <div v-if="navOpen" class="drawer-overlay" aria-hidden="true" @click="closeNav" />
      </transition>

      <transition name="nav-slide">
        <aside v-if="navOpen" id="app-navigation-drawer" ref="drawerRoot" class="navigation-drawer"
          role="dialog" aria-modal="true" aria-labelledby="navigation-drawer-title" @keydown="trapDrawerFocus">
          <div class="drawer-header">
            <div><p class="drawer-eyebrow">TaroTea</p><h2 id="navigation-drawer-title">Explore and practise</h2></div>
            <button ref="drawerCloseButton" type="button" class="drawer-close" aria-label="Close navigation" @click="closeNav">
              <X aria-hidden="true" />
            </button>
          </div>

          <nav class="drawer-navigation" aria-label="All destinations">
            <NuxtLink to="/" class="drawer-home-link" :aria-current="route.path === '/' ? 'page' : undefined" @click="closeNav(false)">
              <House aria-hidden="true" /> Home
            </NuxtLink>

            <section v-for="group in navigationGroups" :key="group.label" class="drawer-group">
              <h3>{{ group.label }}</h3>
              <NuxtLink v-for="link in group.links" :key="link.to" :to="link.to" class="drawer-link"
                :class="{ 'drawer-link-active': isLinkActive(link) }"
                :aria-current="isLinkActive(link) ? 'page' : undefined" @click="closeNav(false)">
                <span class="drawer-link-icon"><component :is="link.icon" aria-hidden="true" /></span>
                <span><strong>{{ link.label }}</strong><small>{{ link.description }}</small></span>
              </NuxtLink>
            </section>
          </nav>

          <div class="drawer-account">
            <template v-if="isLoggedIn">
              <NuxtLink to="/account" @click="closeNav(false)">Account</NuxtLink>
              <NuxtLink to="/stats" @click="closeNav(false)">Stats</NuxtLink>
              <NuxtLink to="/upgrade" @click="closeNav(false)">Upgrade</NuxtLink>
            </template>
            <button v-else type="button" @click="handleLogin">Sign in to save progress</button>
          </div>
        </aside>
      </transition>

      <nav class="mobile-bottom-nav" aria-label="Primary navigation">
        <NuxtLink v-for="link in mobileNavLinks" :key="link.to" :to="link.to" class="mobile-bottom-link"
          :class="{ 'mobile-bottom-link-active': isLinkActive(link) }"
          :aria-current="isLinkActive(link) ? 'page' : undefined">
          <component :is="link.icon" class="mobile-bottom-icon" aria-hidden="true" />
          <span>{{ link.label }}</span>
        </NuxtLink>
        <button type="button" class="mobile-bottom-link" :class="{ 'mobile-bottom-link-active': navOpen || isMoreRouteActive }"
          :aria-expanded="navOpen ? 'true' : 'false'" aria-controls="app-navigation-drawer" @click.stop="toggleNav">
          <Menu class="mobile-bottom-icon" aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>
  </template>
</template>

<style scoped>
.app-header { position: sticky; top: 0; z-index: 80; border-bottom: 1px solid rgb(var(--color-ink) / 0.09); background: rgb(var(--color-canvas) / 0.92); color: rgb(var(--color-ink)); font-family: var(--font-brand); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
.app-header-inner { display: flex; min-height: 4.25rem; max-width: var(--content-wide); margin-inline: auto; padding: 0.55rem var(--page-gutter); align-items: center; gap: clamp(1.25rem, 3vw, 2.5rem); }
.brand-logo { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 0.55rem; color: rgb(var(--color-ink)); font-size: 1.25rem; font-weight: 700; letter-spacing: -0.035em; text-decoration: none; }
.brand-mark { display: inline-flex; width: 2rem; height: 2rem; align-items: center; justify-content: center; border-radius: 0.7rem 0.7rem 0.7rem 0.25rem; background: linear-gradient(145deg, rgb(var(--color-taro-pink)), rgb(var(--color-taro-blue))); color: rgb(var(--color-primary-strong)); font-size: 1rem; box-shadow: inset 0 0 0 1px rgb(var(--color-ink) / 0.08); }
.desktop-primary-nav { display: none; min-width: 0; flex: 1 1 auto; align-items: center; justify-content: center; gap: 0.2rem; }
.desktop-nav-link, .header-action { border-radius: var(--radius-control); color: rgb(var(--color-muted)); font-size: 0.9rem; font-weight: 600; text-decoration: none; transition: background var(--motion-fast) ease, color var(--motion-fast) ease; }
.desktop-nav-link { padding: 0.7rem 0.8rem; }
.desktop-nav-link:hover, .desktop-nav-link-active { background: rgb(var(--color-taro-pink) / 0.25); color: rgb(var(--color-primary-strong)); }
.header-actions { display: flex; margin-left: auto; align-items: center; gap: 0.35rem; }
.header-action { display: inline-flex; min-height: 2.75rem; align-items: center; justify-content: center; gap: 0.45rem; padding: 0.55rem 0.7rem; }
.header-action:hover, .header-action-active { background: rgb(var(--color-taro-blue) / 0.28); color: rgb(var(--color-ink)); }
.header-action :deep(svg) { width: 1.2rem; height: 1.2rem; }
.header-more-action { display: none; }
.account-root { position: relative; }
.account-trigger-label { display: none; max-width: 8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.account-menu { position: absolute; top: calc(100% + 0.6rem); right: 0; width: min(18rem, calc(100vw - 2rem)); border: 1px solid rgb(var(--color-ink) / 0.1); border-radius: var(--radius-card); background: rgb(var(--color-surface)); padding: 0.65rem; box-shadow: var(--shadow-overlay); }
.account-menu-heading { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.55rem 0.8rem; }
.account-menu-heading > span:last-child { display: flex; min-width: 0; flex-direction: column; }
.account-menu-heading strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.account-menu-heading small { color: rgb(var(--color-muted)); font-size: 0.75rem; }
.account-avatar { display: inline-flex; width: 2.4rem; height: 2.4rem; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 999px; background: rgb(var(--color-taro-lilac) / 0.4); color: rgb(var(--color-primary-strong)); font-weight: 700; }
.account-menu-link, .account-sign-in { display: flex; width: 100%; min-height: 2.75rem; align-items: center; gap: 0.65rem; border-radius: 0.75rem; padding: 0.65rem 0.7rem; color: rgb(var(--color-ink)); font-size: 0.9rem; font-weight: 600; text-decoration: none; }
.account-menu-link:hover { background: rgb(var(--color-ink) / 0.045); }
.account-menu-link :deep(svg), .account-sign-in :deep(svg) { width: 1.1rem; height: 1.1rem; }
.account-menu-upgrade { color: rgb(var(--color-primary-strong)); }
.account-menu-danger { color: rgb(var(--color-error-strong)); }
.account-menu-divider { height: 1px; margin: 0.45rem; background: rgb(var(--color-ink) / 0.09); }
.account-menu-message { margin: 0; padding: 0.6rem 0.6rem 0.85rem; color: rgb(var(--color-muted)); font-size: 0.875rem; line-height: 1.55; }
.account-sign-in { justify-content: center; background: rgb(var(--color-primary)); color: white; }
.drawer-overlay { position: fixed; inset: 0; z-index: 85; background: rgb(var(--color-ink) / 0.26); backdrop-filter: blur(3px); }
.navigation-drawer { position: fixed; top: 0; right: 0; z-index: 90; display: flex; width: min(26rem, 94vw); height: 100dvh; flex-direction: column; background: rgb(var(--color-canvas)); box-shadow: var(--shadow-overlay); }
.drawer-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; border-bottom: 1px solid rgb(var(--color-ink) / 0.09); padding: 1.2rem var(--page-gutter); }
.drawer-eyebrow, .drawer-header h2 { margin: 0; }
.drawer-eyebrow { color: rgb(var(--color-primary-strong)); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.drawer-header h2 { margin-top: 0.25rem; font-size: 1.35rem; letter-spacing: -0.025em; }
.drawer-close { display: inline-flex; width: 2.75rem; height: 2.75rem; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: var(--radius-control); color: rgb(var(--color-ink)); }
.drawer-close:hover { background: rgb(var(--color-ink) / 0.05); }
.drawer-close :deep(svg) { width: 1.25rem; height: 1.25rem; }
.drawer-navigation { flex: 1 1 auto; overflow-y: auto; padding: 1rem var(--page-gutter) 1.5rem; overscroll-behavior: contain; }
.drawer-home-link { display: flex; min-height: 2.75rem; align-items: center; gap: 0.65rem; border-radius: var(--radius-control); padding: 0.65rem 0.75rem; background: rgb(var(--color-surface)); color: rgb(var(--color-ink)); font-weight: 700; text-decoration: none; }
.drawer-home-link :deep(svg) { width: 1.1rem; height: 1.1rem; }
.drawer-group { margin-top: 1.5rem; }
.drawer-group h3 { margin: 0 0 0.55rem; padding-inline: 0.35rem; color: rgb(var(--color-muted)); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.drawer-link { display: flex; min-height: 3.65rem; align-items: center; gap: 0.75rem; border-radius: var(--radius-control); padding: 0.55rem; color: rgb(var(--color-ink)); text-decoration: none; transition: background var(--motion-fast) ease; }
.drawer-link:hover, .drawer-link-active { background: rgb(var(--color-taro-pink) / 0.24); }
.drawer-link-icon { display: inline-flex; width: 2.5rem; height: 2.5rem; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 0.75rem; background: rgb(var(--color-surface)); color: rgb(var(--color-primary-strong)); box-shadow: inset 0 0 0 1px rgb(var(--color-ink) / 0.07); }
.drawer-link-icon :deep(svg) { width: 1.15rem; height: 1.15rem; }
.drawer-link > span:last-child { display: flex; min-width: 0; flex-direction: column; }
.drawer-link strong { font-size: 0.9rem; }
.drawer-link small { margin-top: 0.15rem; color: rgb(var(--color-muted)); font-size: 0.75rem; line-height: 1.35; }
.drawer-account { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; border-top: 1px solid rgb(var(--color-ink) / 0.09); padding: 1rem var(--page-gutter) calc(1rem + env(safe-area-inset-bottom, 0px)); }
.drawer-account a, .drawer-account button { min-height: 2.75rem; color: rgb(var(--color-primary-strong)); font-size: 0.85rem; font-weight: 700; text-decoration: none; }
.mobile-bottom-nav { position: fixed; right: 0; bottom: 0; left: 0; z-index: 75; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); min-height: calc(4.35rem + env(safe-area-inset-bottom, 0px)); padding: 0.35rem 0.25rem calc(0.35rem + env(safe-area-inset-bottom, 0px)); border-top: 1px solid rgb(var(--color-ink) / 0.1); background: rgb(var(--color-canvas) / 0.95); box-shadow: 0 -8px 24px rgb(var(--color-ink) / 0.07); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
.mobile-bottom-link { position: relative; display: flex; min-width: 0; min-height: 3.5rem; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem; border-radius: 0.8rem; color: rgb(var(--color-muted)); font-size: 0.68rem; font-weight: 600; line-height: 1; text-decoration: none; transition: background var(--motion-fast) ease, color var(--motion-fast) ease, transform var(--motion-fast) ease; -webkit-tap-highlight-color: transparent; }
.mobile-bottom-link:active { transform: scale(0.97); }
.mobile-bottom-link-active { background: rgb(var(--color-taro-pink) / 0.28); color: rgb(var(--color-primary-strong)); }
.mobile-bottom-link-active::before { content: ''; position: absolute; top: 0.2rem; width: 1.25rem; height: 0.15rem; border-radius: 999px; background: rgb(var(--color-primary)); }
.mobile-bottom-icon { width: 1.25rem; height: 1.25rem; stroke-width: 2.1; }
.app-header-focus .app-header-inner { justify-content: space-between; }
.quiz-header-progress-slot { display: flex; min-width: 0; flex: 1 1 auto; justify-content: center; }
.app-header-focus:has(.quiz-header-progress-content) .focus-label { display: none; }
.focus-label { display: none; margin-inline: auto; color: rgb(var(--color-muted)); font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.focus-exit { display: inline-flex; min-height: 2.75rem; align-items: center; gap: 0.4rem; border-radius: var(--radius-control); padding: 0.55rem 0.7rem; color: rgb(var(--color-primary-strong)); font-size: 0.85rem; font-weight: 700; }
.focus-exit:hover { background: rgb(var(--color-taro-pink) / 0.25); }
.focus-exit :deep(svg) { width: 1rem; height: 1rem; }
.nav-fade-enter-active, .nav-fade-leave-active { transition: opacity var(--motion-panel) ease; }
.nav-fade-enter-from, .nav-fade-leave-to { opacity: 0; }
.nav-slide-enter-active, .nav-slide-leave-active { transition: transform var(--motion-panel) ease; }
.nav-slide-enter-from, .nav-slide-leave-to { transform: translateX(100%); }
@media (min-width: 640px) { .account-trigger-label, .focus-label { display: inline; } }
@media (max-width: 479px) {
  .app-header-focus:has(.quiz-header-progress-content) .app-header-inner { gap: 0.5rem; padding-inline: 0.75rem; }
  .app-header-focus:has(.quiz-header-progress-content) .brand-logo > span:last-child { display: none; }
  .app-header-focus:has(.quiz-header-progress-content) .focus-exit { padding-inline: 0.4rem; font-size: 0.75rem; white-space: nowrap; }
}
@media (min-width: 768px) { .header-more-action { display: inline-flex; } .mobile-bottom-nav { display: none; } }
@media (min-width: 960px) { .desktop-primary-nav { display: flex; } }
</style>
