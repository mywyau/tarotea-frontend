export function useNavAuth() {
  const me = useState<any | null | undefined>("me", () => undefined); // undefined=loading, null=logged out
  const loading = useState<boolean>("meLoading", () => false);

  const refresh = async () => {
    if (!process.client) return;

    loading.value = true;

    //   try {
    //     const { isAuthenticated, getAccessToken } = await useAuth();

    //     if (!isAuthenticated) {
    //       me.value = null;
    //       return;
    //     }

    //     const token = await getAccessToken();
    //     if (!token) {
    //       me.value = null;
    //       return;
    //     }

    //     me.value = await $fetch("/api/me", {
    //       headers: { Authorization: `Bearer ${token}` },
    //       cache: "no-store",
    //     });
    //   } finally {
    //     loading.value = false;
    //   }
    // };

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
    } catch {
      me.value = null;
    } finally {
      loading.value = false;
    }
  };

  const status = computed<"loading" | "logged-in" | "logged-out">(() => {
    if (loading.value || me.value === undefined) {
      return "loading";
    }

    if (me.value) {
      return "logged-in";
    }

    return "logged-out";
  });

  const authReady = computed(() => me.value !== undefined);

  if (process.client) {
    refresh();
  }

  return { me, loading, authReady, status, refresh };
}
