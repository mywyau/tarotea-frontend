export interface MeUser {
  id: string;
  email: string;
  plan?: "free" | "pro";
}

export type MeState =
  | { status: "loading" }
  | { status: "logged-out" }
  | { status: "logged-in"; user: MeUser };

export function useMeStateV2() {
  const state = useState<MeState>("meState", () => ({
    status: "loading",
  }));

  const resolved = useState<boolean>("meResolved", () => false);

  const resolve = async (): Promise<void> => {
    if (resolved.value) return;
    if (process.server) return;

    const auth = await useAuth();

    const isAuthenticated = auth.isAuthenticated === true;

    if (!isAuthenticated) {
      state.value = { status: "logged-out" };
      resolved.value = true;
      return;
    }

    try {
      const token = await auth.getAccessToken();

      const user = await $fetch<MeUser>("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      state.value = { status: "logged-in", user };
    } catch {
      state.value = { status: "logged-out" };
    } finally {
      resolved.value = true;
    }
  };

  const authReady = computed(() => state.value.status !== "loading");

  const isLoggedIn = computed(() => state.value.status === "logged-in");

  const user = computed<MeUser | null>(() =>
    state.value.status === "logged-in" ? state.value.user : null,
  );

  return {
    state,
    authReady,
    isLoggedIn,
    user,
    resolve,
  };
}
