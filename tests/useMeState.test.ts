import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref, computed as vueComputed } from "vue";
import { useMeState } from "../composables/useMeState";

vi.stubGlobal("useState", (_key: string, init: () => any) => {
  return ref(init());
});

vi.stubGlobal("computed", vueComputed);

// ---- mocks ----

// mock Nuxt useState
vi.mock("#app", () => ({
  useState: (_key: string, init: () => any) => ref(init()),
}));

// mock Vue computed (Vitest doesn’t auto-provide it)
vi.mock("vue", async () => {
  const actual = await vi.importActual<any>("vue");
  return {
    ...actual,
    computed: actual.computed,
  };
});

// mock $fetch
const fetchMock = vi.fn();
vi.stubGlobal("$fetch", fetchMock);

// mock Auth0
const useAuthMock = vi.fn();
vi.stubGlobal("useAuth", useAuthMock);

// force client environment
Object.defineProperty(process, "client", {
  value: true,
});

describe("useMeState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with me = undefined and loading = false", () => {
    const { me, loading, authReady } = useMeState();

    expect(me.value).toBeUndefined();
    expect(loading.value).toBe(false);
    expect(authReady.value).toBe(false);
  });

  it("sets me = null when user is not authenticated", async () => {
    useAuthMock.mockResolvedValue({
      isAuthenticated: false,
    });

    const { me, refresh } = useMeState();
    await refresh();

    expect(me.value).toBeNull();
  });

  it("sets me = null when token is missing", async () => {
    useAuthMock.mockResolvedValue({
      isAuthenticated: true,
      getAccessToken: vi.fn().mockResolvedValue(null),
    });

    const { me, refresh } = useMeState();
    await refresh();

    expect(me.value).toBeNull();
  });

  it("fetches /api/me and sets me when authenticated", async () => {
    const fakeUser = { id: "123", email: "test@example.com" };

    useAuthMock.mockResolvedValue({
      isAuthenticated: true,
      getAccessToken: vi.fn().mockResolvedValue("fake-token"),
    });

    fetchMock.mockResolvedValue(fakeUser);

    const { me, refresh, authReady } = useMeState();
    await refresh();

    expect(fetchMock).toHaveBeenCalledWith("/api/me", {
      headers: { Authorization: "Bearer fake-token" },
      cache: "no-store",
    });

    expect(me.value).toEqual(fakeUser);
    expect(authReady.value).toBe(true);
  });

  it("always sets loading to false after refresh", async () => {
    useAuthMock.mockResolvedValue({
      isAuthenticated: false,
    });

    const { loading, refresh } = useMeState();
    await refresh();

    expect(loading.value).toBe(false);
  });
});
