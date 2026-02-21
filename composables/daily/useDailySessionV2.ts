import type { DailyWord } from "@/types/daily/DailyItem";

export function shuffleDailyWords<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

type DailyStartResponse = {
  dailyLocked?: boolean;
  // optional: when locked you might return {requiredWords, currentWordCount}
  requiredWords?: number;
  currentWordCount?: number;
  session: {
    completed: boolean;
    word_ids: string[];
    answered_count: number;
    correct_count: number;
    xp_earned: number;
    total_questions: number;
  };
};

/**
 * Preferred: one endpoint that returns the word JSONs for many ids.
 * Implement this on your Nuxt server to fetch CDN JSONs in parallel server-side.
 */
async function fetchWordsByIdsBatch(
  token: string,
  wordIds: string[]
): Promise<DailyWord[]> {
  if (wordIds.length === 0) return [];

  // ✅ You implement this endpoint (recommended)
  return await $fetch<DailyWord[]>("/api/daily/words", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: { wordIds },
  });
}

/**
 * Fallback: fetch one-by-one (works if you already have /api/word?id=... or similar).
 * Replace "/api/word" with your actual endpoint.
 */
async function fetchWordsByIdsIndividually(
  token: string,
  wordIds: string[]
): Promise<DailyWord[]> {
  const results = await Promise.all(
    wordIds.map((id) =>
      $fetch<DailyWord>("/api/word", {
        // TODO: change to your existing word endpoint
        query: { id },
        headers: { Authorization: `Bearer ${token}` },
      })
    )
  );
  return results;
}

export function useDailySession() {
  const loading = ref(true);
  const dailyCompleted = ref(false);

  const answeredCount = ref(0);
  const totalQuestions = ref(0);
  const correctCount = ref(0);
  const xpToday = ref(0);

  const dailyLocked = ref(false);
  const requiredWords = ref(20);
  const currentWordCount = ref(0);

  const questions = ref<DailyWord[]>([]);

  async function loadSession(token: string) {
    loading.value = true;

    // 1) Start (or resume) today's daily session
    const startRes = await $fetch<DailyStartResponse>("/api/daily/start", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { totalQuestions: 20 }, // optional
    });

    // 2) Locked state (no progress rows)
    if (startRes.dailyLocked) {
      dailyLocked.value = true;
      requiredWords.value = startRes.requiredWords ?? 20;
      currentWordCount.value = startRes.currentWordCount ?? 0;
      questions.value = [];
      loading.value = false;
      return;
    }

    dailyLocked.value = false;

    // 3) Hydrate counters from session
    dailyCompleted.value = startRes.session.completed;
    answeredCount.value = startRes.session.answered_count ?? 0;
    totalQuestions.value = startRes.session.total_questions ?? 0;
    correctCount.value = startRes.session.correct_count ?? 0;
    xpToday.value = startRes.session.xp_earned ?? 0;

    // 4) Build questions list from word_ids (if not completed)
    if (dailyCompleted.value) {
      questions.value = [];
      loading.value = false;
      return;
    }

    const wordIds = startRes.session.word_ids ?? [];
    if (wordIds.length === 0) {
      // should not normally happen if unlocked, but safe-guard
      questions.value = [];
      loading.value = false;
      return;
    }

    // Preferred: batch fetch
    // const words = await fetchWordsByIdsBatch(token, wordIds);

    // Fallback: one-by-one fetch (uncomment if you don't have batch endpoint yet)
    // const words = await fetchWordsByIdsIndividually(token, wordIds);

    // Choose one:
    const words = await fetchWordsByIdsBatch(token, wordIds).catch(async () => {
      // graceful fallback if batch endpoint isn't ready
      return await fetchWordsByIdsIndividually(token, wordIds);
    });

    questions.value = shuffleDailyWords(words);
    loading.value = false;
  }

  return {
    loading,
    dailyLocked,
    requiredWords,
    currentWordCount,
    dailyCompleted,
    answeredCount,
    totalQuestions,
    correctCount,
    xpToday,
    questions,
    loadSession,
  };
}