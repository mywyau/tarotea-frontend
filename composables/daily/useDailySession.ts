import type { DailySessionResponse, DailyWord } from "@/types/daily/DailyItem";

export function shuffleDailyWords<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// export function useDailySession() {
//   const loading = ref(true);
//   const dailyCompleted = ref(false);

//   const answeredCount = ref(0);
//   const totalQuestions = ref(0);
//   const correctCount = ref(0);
//   const xpToday = ref(0);

//   const questions = ref<DailyWord[]>([]);

//   async function loadSession(token: string) {
//     const dailyData = await $fetch<DailySessionResponse>("/api/daily", {
//       headers: { Authorization: `Bearer ${token}` },
//     });

//     dailyCompleted.value = dailyData.completed;
//     answeredCount.value = dailyData.answeredCount;
//     totalQuestions.value = dailyData.totalQuestions;
//     correctCount.value = dailyData.correctCount;
//     xpToday.value = dailyData.xpEarnedToday;

//     questions.value = dailyData.completed
//       ? new Array(dailyData.totalQuestions).fill(null)
//       : shuffleDailyWords(dailyData.words);

//     loading.value = false;
//   }

//   return {
//     loading,
//     dailyCompleted,
//     answeredCount,
//     totalQuestions,
//     correctCount,
//     xpToday,
//     questions,
//     loadSession,
//   };
// }

export function useDailySession() {
  const loading = ref(true)
  const dailyCompleted = ref(false)

  const answeredCount = ref(0)
  const totalQuestions = ref(0)
  const correctCount = ref(0)
  const xpToday = ref(0)

  const questions = ref<DailyWord[]>([])

  async function loadSession(token: string) {
    const dailyData = await $fetch<DailySessionResponse>("/api/daily", {
      headers: { Authorization: `Bearer ${token}` },
    })

    dailyCompleted.value = dailyData.completed
    answeredCount.value = dailyData.answeredCount
    totalQuestions.value = dailyData.totalQuestions
    correctCount.value = dailyData.correctCount
    xpToday.value = dailyData.xpEarnedToday

    questions.value = dailyData.completed
      ? []
      : shuffleDailyWords(dailyData.words)

    loading.value = false
  }

  async function completeSession(token: string) {
    if (answeredCount.value < totalQuestions.value) return
    if (dailyCompleted.value) return

    await $fetch("/api/daily/complete", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        xpEarned: xpToday.value,
        correctCount: correctCount.value,
        totalQuestions: totalQuestions.value,
      },
    })

    dailyCompleted.value = true
  }

  return {
    loading,
    dailyCompleted,
    answeredCount,
    totalQuestions,
    correctCount,
    xpToday,
    questions,
    loadSession,
    completeSession, // 👈 expose it
  }
}
