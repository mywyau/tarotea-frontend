import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";

vi.mock("@/utils/shuffle", () => ({
  shuffleFisherYates: vi.fn((items: unknown[]) => [...items].reverse()),
}));

vi.stubGlobal("ref", ref);
vi.stubGlobal("computed", computed);

const fetchMock = vi.fn();
vi.stubGlobal("$fetch", fetchMock);

const mountedCallbacks: Array<() => void> = [];
const unmountedCallbacks: Array<() => void> = [];
vi.stubGlobal("onMounted", (callback: () => void) => mountedCallbacks.push(callback));
vi.stubGlobal("onUnmounted", (callback: () => void) =>
  unmountedCallbacks.push(callback),
);

const { progressPercent } = await import("../composables/daily/progressPercent");
const { useCountdownToUtcMidnight } = await import(
  "../composables/daily/useCountdownToUtcMidnight"
);
const { useDailySession } = await import("../composables/daily/useDailySession");
const { useDailySession: useDailySessionV2 } = await import(
  "../composables/daily/useDailySessionV2"
);

describe("daily composables", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mountedCallbacks.length = 0;
    unmountedCallbacks.length = 0;
    vi.useRealTimers();
  });

  it("computes progress percentages and protects against empty totals", () => {
    expect(progressPercent(20, 7).value).toBe(35);
    expect(progressPercent(3, 2).value).toBe(67);
    expect(progressPercent(0, 2).value).toBe(0);
  });

  it("counts down to the next UTC midnight and clears its interval", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T23:59:58.250Z"));

    const { timeRemaining } = useCountdownToUtcMidnight();

    expect(timeRemaining.value).toBe("");
    expect(mountedCallbacks).toHaveLength(1);
    expect(unmountedCallbacks).toHaveLength(1);

    mountedCallbacks[0]();
    expect(timeRemaining.value).toBe("00:00:01");

    vi.advanceTimersByTime(1000);
    expect(timeRemaining.value).toBe("00:00:00");

    unmountedCallbacks[0]();
    vi.setSystemTime(new Date("2026-05-29T20:00:00.000Z"));
    vi.advanceTimersByTime(1000);
    expect(timeRemaining.value).toBe("00:00:00");
  });

  it("loads a locked daily session without requesting questions", async () => {
    fetchMock.mockResolvedValueOnce({ locked: true, required: 25, current: 12 });

    const session = useDailySession();
    await session.loadSession("token-123");

    expect(fetchMock).toHaveBeenCalledWith("/api/daily", {
      headers: { Authorization: "Bearer token-123" },
    });
    expect(session.loading.value).toBe(false);
    expect(session.dailyLocked.value).toBe(true);
    expect(session.requiredWords.value).toBe(25);
    expect(session.currentWordCount.value).toBe(12);
    expect(session.questions.value).toEqual([]);
  });

  it("loads, shuffles, and completes an unlocked daily session", async () => {
    const words = [{ id: "one" }, { id: "two" }, { id: "three" }];
    fetchMock.mockResolvedValueOnce({
      locked: false,
      completed: false,
      answeredCount: 20,
      totalQuestions: 20,
      correctCount: 18,
      xpEarnedToday: 90,
      words,
    });
    fetchMock.mockResolvedValueOnce({ ok: true });

    const session = useDailySession();
    await session.loadSession("token-123");

    expect(session.questions.value).toEqual([...words].reverse());
    expect(session.correctCount.value).toBe(18);
    expect(session.xpToday.value).toBe(90);

    await session.completeSession("token-123");

    expect(fetchMock).toHaveBeenLastCalledWith("/api/daily/complete", {
      method: "POST",
      headers: { Authorization: "Bearer token-123" },
      body: {
        xpEarned: 90,
        correctCount: 18,
        totalQuestions: 20,
      },
    });
    expect(session.dailyCompleted.value).toBe(true);
  });

  it("does not complete daily sessions before all answers are submitted", async () => {
    const session = useDailySession();
    session.answeredCount.value = 3;
    session.totalQuestions.value = 20;

    await session.completeSession("token-123");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(session.dailyCompleted.value).toBe(false);
  });

  it("starts V2 sessions and falls back to individual word fetches when batch hydration fails", async () => {
    const firstWord = { id: "first" };
    const secondWord = { id: "second" };

    fetchMock
      .mockResolvedValueOnce({
        dailyLocked: false,
        session: {
          completed: false,
          word_ids: ["first", "second"],
          answered_count: 4,
          correct_count: 3,
          xp_earned: 15,
          total_questions: 20,
        },
      })
      .mockRejectedValueOnce(new Error("batch endpoint unavailable"))
      .mockResolvedValueOnce(firstWord)
      .mockResolvedValueOnce(secondWord);

    const session = useDailySessionV2();
    await session.loadSession("token-456");

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/daily/start", {
      method: "POST",
      headers: { Authorization: "Bearer token-456" },
      body: { totalQuestions: 20, mode: "daily_meaning_quiz" },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/daily/words", {
      method: "POST",
      headers: { Authorization: "Bearer token-456" },
      body: { wordIds: ["first", "second"] },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/word", {
      query: { id: "first" },
      headers: { Authorization: "Bearer token-456" },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/word", {
      query: { id: "second" },
      headers: { Authorization: "Bearer token-456" },
    });
    expect(session.loading.value).toBe(false);
    expect(session.answeredCount.value).toBe(4);
    expect(session.questions.value).toEqual([secondWord, firstWord]);
  });

  it("keeps V2 locked sessions empty and records unlock requirements", async () => {
    fetchMock.mockResolvedValueOnce({
      dailyLocked: true,
      requiredWords: 30,
      currentWordCount: 9,
      session: {
        completed: false,
        word_ids: ["ignored"],
        answered_count: 0,
        correct_count: 0,
        xp_earned: 0,
        total_questions: 20,
      },
    });

    const session = useDailySessionV2();
    await session.loadSession("token-456");

    expect(session.loading.value).toBe(false);
    expect(session.dailyLocked.value).toBe(true);
    expect(session.requiredWords.value).toBe(30);
    expect(session.currentWordCount.value).toBe(9);
    expect(session.questions.value).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
