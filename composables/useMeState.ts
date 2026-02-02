export function useMeState() {

  const me = useState<any | null | undefined>("me", () => undefined); // undefined=loading, null=logged out

  const loading = useState<boolean>("meLoading", () => false);

  const refresh = async () => {
    
    if (!process.client) return;

    loading.value = true;

    try {
      const { isAuthenticated, getAccessToken } = await useAuth();

      if (!isAuthenticated) {
        me.value = null;
        return;
      }

      const token = await getAccessToken();
      if (!token) {
        me.value = null;
        return;
      }

      me.value = await $fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      console.log(`[useMeState] `, me.value)
    } finally {
      loading.value = false;
      console.log(`[finally] `, me.value)
    }
  };

  const authReady = computed(() => me.value !== undefined);

  return { me, loading, authReady, refresh };
}
