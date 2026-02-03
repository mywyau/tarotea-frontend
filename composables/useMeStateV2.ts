export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled";

export interface Entitlement {
  plan: "free" | "monthly" | "yearly";
  subscription_status: SubscriptionStatus;
  active: boolean;
  cancel_at_period_end: boolean;
  current_period_end?: string;
  canceled_at?: string;
}

export interface MeUser {
  id: string;
  email: string;
  entitlement: Entitlement;
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

      const user = await $fetch<MeUser>("/api/meV2", {
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

  const entitlement = computed(() =>
    state.value.status === "logged-in" ? state.value.user.entitlement : null,
  );

  const hasPaidAccess = computed(() =>
    entitlement.value
      ? ["active", "trialing", "past_due"].includes(
          entitlement.value.subscription_status,
        )
      : false,
  );

  const isCanceling = computed(
    () => entitlement.value?.cancel_at_period_end === true,
  );

  const currentPeriodEnd = computed(() =>
    entitlement.value?.current_period_end
      ? new Date(entitlement.value.current_period_end)
      : null,
  );

  return {
    state,
    authReady,
    isLoggedIn,
    user,
    entitlement,
    hasPaidAccess,
    isCanceling,
    currentPeriodEnd,
    resolve,
  };
}
