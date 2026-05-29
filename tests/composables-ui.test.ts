import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, nextTick, ref, watch } from "vue";

const useStateStore = new Map<string, ReturnType<typeof ref>>();

vi.stubGlobal("computed", computed);
vi.stubGlobal("ref", ref);
vi.stubGlobal("watch", watch);
vi.stubGlobal("useState", (key: string, init: () => unknown) => {
  if (!useStateStore.has(key)) {
    useStateStore.set(key, ref(init()));
  }
  return useStateStore.get(key);
});

function createLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  };
}

const localStorageMock = createLocalStorage();
vi.stubGlobal("localStorage", localStorageMock);
vi.stubGlobal("window", {
  history: { length: 0, back: vi.fn() },
  location: { origin: "https://tarotea.test", replace: vi.fn() },
});

const navigateToMock = vi.fn();
vi.stubGlobal("navigateTo", navigateToMock);

const fetchMock = vi.fn();
vi.stubGlobal("$fetch", fetchMock);

const useAuthMock = vi.fn();
vi.stubGlobal("useAuth", useAuthMock);

vi.stubGlobal("onBeforeUnmount", vi.fn());

const { useAudioVolume } = await import("../composables/useAudioVolume");
const { useGlobalAudio } = await import("../composables/useGlobalAudio");
const { useGoBack } = await import("../composables/useGoBack");
const { useMeState } = await import("../composables/useMeState");
const { useUpgrade } = await import("../composables/useUpgrade");
const { useXpAnimation } = await import("../composables/daily/useXpAnimation");
const { useQuizTimer } = await import("../composables/quiz/useQuizTimer");

describe("UI and auth-adjacent composables", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    useStateStore.clear();
    localStorage.clear();
    (window.history.back as ReturnType<typeof vi.fn>).mockClear();
    Object.defineProperty(window, "history", {
      value: { length: 0, back: vi.fn() },
      configurable: true,
    });
    Object.defineProperty(window, "location", {
      value: { origin: "https://tarotea.test", replace: vi.fn() },
      configurable: true,
    });

    Object.defineProperty(process, "client", {
      value: true,
      configurable: true,
    });
    Object.defineProperty(process, "server", {
      value: false,
      configurable: true,
    });
  });

  it("initializes audio volume from localStorage and persists changes", async () => {
    localStorage.setItem("audio-volume", "0.4");

    const { volume } = useAudioVolume();
    expect(volume.value).toBe(0.4);

    volume.value = 0.75;
    await nextTick();

    expect(localStorage.getItem("audio-volume")).toBe("0.75");
  });

  it("pauses the previous global audio element when another starts", () => {
    const firstAudio = {
      pause: vi.fn(),
      play: vi.fn(),
      currentTime: 34,
    } as unknown as HTMLAudioElement;
    const secondAudio = {
      pause: vi.fn(),
      play: vi.fn(),
      currentTime: 12,
    } as unknown as HTMLAudioElement;

    const { current, play, stop } = useGlobalAudio();

    play(firstAudio);
    expect(current.value?.pause).toBe(firstAudio.pause);
    expect(firstAudio.play).toHaveBeenCalledTimes(1);

    play(secondAudio);
    expect(firstAudio.pause).toHaveBeenCalledTimes(1);
    expect(firstAudio.currentTime).toBe(0);
    expect(current.value?.pause).toBe(secondAudio.pause);
    expect(secondAudio.play).toHaveBeenCalledTimes(1);

    stop();
    expect(secondAudio.pause).toHaveBeenCalledTimes(1);
    expect(secondAudio.currentTime).toBe(0);
    expect(current.value).toBeNull();
  });

  it("falls back to the default route when browser history is unavailable", () => {
    const goBack = useGoBack("/fallback");

    goBack();

    expect(navigateToMock).toHaveBeenCalledWith("/fallback");
  });

  it("refreshes the legacy me state from /api/me when authenticated", async () => {
    const user = { id: "user-123", email: "test@example.com" };
    useAuthMock.mockResolvedValue({
      isAuthenticated: true,
      getAccessToken: vi.fn().mockResolvedValue("access-token"),
    });
    fetchMock.mockResolvedValue(user);

    const { me, loading, authReady, refresh } = useMeState();
    expect(authReady.value).toBe(false);

    await refresh();

    expect(fetchMock).toHaveBeenCalledWith("/api/me", {
      headers: { Authorization: "Bearer access-token" },
      cache: "no-store",
    });
    expect(me.value).toEqual(user);
    expect(loading.value).toBe(false);
    expect(authReady.value).toBe(true);
  });

  it("logs the legacy me state out when authentication is missing", async () => {
    useAuthMock.mockResolvedValue({ isAuthenticated: false });

    const { me, loading, refresh } = useMeState();
    await refresh();

    expect(me.value).toBeNull();
    expect(loading.value).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates a Stripe checkout session and redirects to its URL", async () => {
    const replaceMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { replace: replaceMock },
      configurable: true,
    });
    useAuthMock.mockResolvedValue({
      getAccessToken: vi.fn().mockResolvedValue("billing-token"),
    });
    fetchMock.mockResolvedValue({ url: "https://checkout.example/session" });

    await useUpgrade("yearly");

    expect(fetchMock).toHaveBeenCalledWith("/api/stripe/checkout", {
      method: "POST",
      headers: { Authorization: "Bearer billing-token" },
      body: { billing: "yearly" },
    });
    expect(replaceMock).toHaveBeenCalledWith("https://checkout.example/session");
  });

  it("drives XP animation state with timers and reset", () => {
    vi.useFakeTimers();
    const animation = useXpAnimation();

    animation.triggerXp(10, false);
    expect(animation.xpDelta.value).toBe(10);
    expect(animation.readyForNext.value).toBe(false);

    vi.advanceTimersByTime(180);
    expect(animation.readyForNext.value).toBe(true);

    vi.advanceTimersByTime(820);
    expect(animation.mergingXp.value).toBe(true);

    vi.advanceTimersByTime(400);
    expect(animation.xpDelta.value).toBeNull();
    expect(animation.mergingXp.value).toBe(false);

    animation.triggerXp(5, true);
    vi.advanceTimersByTime(180);
    expect(animation.readyForNext.value).toBe(false);

    animation.reset();
    expect(animation.xpDelta.value).toBeNull();
    expect(animation.mergingXp.value).toBe(false);
    expect(animation.readyForNext.value).toBe(false);
  });

  it("starts, freezes, formats, and resets quiz timer state", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);

    const timer = useQuizTimer();
    timer.startTimer();

    expect(timer.quizStartedAt.value).toBe(1_000);
    expect(timer.formattedElapsedTime.value).toBe("0:00");

    vi.setSystemTime(62_250);
    vi.advanceTimersByTime(250);
    expect(timer.elapsedMs.value).toBe(61_500);
    expect(timer.formattedElapsedTime.value).toBe("1:01");

    vi.setSystemTime(63_000);
    timer.freezeTimer();
    expect(timer.frozenElapsedMs.value).toBe(62_000);
    expect(timer.displayedElapsedMs.value).toBe(62_000);
    expect(timer.formattedElapsedTime.value).toBe("1:02");

    timer.resetTimer();
    expect(timer.quizStartedAt.value).toBeNull();
    expect(timer.elapsedMs.value).toBe(0);
    expect(timer.frozenElapsedMs.value).toBeNull();
  });
});
