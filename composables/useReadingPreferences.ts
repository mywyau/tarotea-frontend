export function useReadingPreferences() {
  const options = {
    default: () => true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 180,
  }
  return {
    showJyutping: useCookie<boolean>('word-page-show-jyutping', options),
    showTranslation: useCookie<boolean>('word-page-show-translation', options),
  }
}
