type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'tarotea-theme-mode'

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null

  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : null
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return

  document.documentElement.classList.toggle('dark', mode === 'dark')
  document.documentElement.style.colorScheme = mode
}

export function useThemeMode() {
  const mode = useState<ThemeMode>('theme-mode', () => 'light')

  const isDark = computed(() => mode.value === 'dark')

  function setTheme(nextMode: ThemeMode) {
    mode.value = nextMode
    applyTheme(nextMode)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextMode)
    }
  }

  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  function initialiseTheme() {
    const initialMode = readStoredTheme() ?? getSystemTheme()
    mode.value = initialMode
    applyTheme(initialMode)
  }

  return {
    mode,
    isDark,
    setTheme,
    toggleTheme,
    initialiseTheme,
  }
}
