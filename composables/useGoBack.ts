export function useGoBack(defaultRoute: string = '/') {
  return () => {
    if (import.meta.client && window.history.length > 1) {
      window.history.back()
    } else {
      navigateTo(defaultRoute)
    }
  }
}