import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref, computed as vueComputed } from "vue";
import { useMeStateV2, type MeUser } from "../composables/useMeStateV2";

// -----------------------
// Global stubs (Nuxt)
// -----------------------
vi.stubGlobal("useState", (_key: string, init: () => any) => ref(init()));
vi.stubGlobal("computed", vueComputed);

// -----------------------
// Mocks
// -----------------------
const useAuthMock = vi.fn();
vi.stubGlobal("useAuth", useAuthMock);

const fetchMock = vi.fn();
vi.stubGlobal("$fetch", fetchMock);

// Force client mode
Object.defineProperty(process, "server", {
  value: false,
});

describe("useMeStateV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in loading state", () => {
    const { state, authReady, isLoggedIn, user } = useMeStateV2();

    expect(state.value.status).toBe("loading");
    expect(authReady.value).toBe(false);
    expect(isLoggedIn.value).toBe(false);
    expect(user.value).toBeNull();
  });

  it("sets logged-out when not authenticated", async () => {
    useAuthMock.mockResolvedValue({
      isAuthenticated: false,
    });

    const { state, resolve, authReady } = useMeStateV2();
    await resolve();

    expect(state.value.status).toBe("logged-out");
    expect(authReady.value).toBe(true);
  });

  it("sets logged-in when authenticated and /api/me succeeds", async () => {
    const fakeUser: MeUser = {
      id: "123",
      email: "test@example.com",
      plan: "pro",
    };

    useAuthMock.mockResolvedValue({
      isAuthenticated: true,
      getAccessToken: vi.fn().mockResolvedValue("fake-token"),
    });

    fetchMock.mockResolvedValue(fakeUser);

    const { state, resolve, isLoggedIn, user } = useMeStateV2();
    await resolve();

    expect(fetchMock).toHaveBeenCalledWith("/api/me", {
      headers: { Authorization: "Bearer fake-token" },
      cache: "no-store",
    });

    expect(state.value.status).toBe("logged-in");
    expect(isLoggedIn.value).toBe(true);
    expect(user.value).toEqual(fakeUser);
  });

  it("falls back to logged-out if /api/me throws", async () => {
    useAuthMock.mockResolvedValue({
      isAuthenticated: true,
      getAccessToken: vi.fn().mockResolvedValue("fake-token"),
    });

    fetchMock.mockRejectedValue(new Error("boom"));

    const { state, resolve } = useMeStateV2();
    await resolve();

    expect(state.value.status).toBe("logged-out");
  });

  it("does not re-run resolve once resolved", async () => {
    useAuthMock.mockResolvedValue({
      isAuthenticated: false,
    });

    const { resolve } = useMeStateV2();

    await resolve();
    await resolve();

    // useAuth should only be called once
    expect(useAuthMock).toHaveBeenCalledTimes(1);
  });
});
