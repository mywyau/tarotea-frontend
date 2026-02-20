export function useCountdownToUtcMidnight() {
  const timeRemaining = ref("");
  let interval: ReturnType<typeof setInterval> | null = null

  function updateCountdown() {
    const now = new Date();
    const nextMidnight = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
      ),
    );

    const diff = nextMidnight.getTime() - now.getTime();
    if (diff <= 0) {
      timeRemaining.value = "00:00:00";
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    timeRemaining.value =
      `${String(hours).padStart(2, "0")}:` +
      `${String(minutes).padStart(2, "0")}:` +
      `${String(seconds).padStart(2, "0")}`;
  }

  onMounted(() => {
    updateCountdown();
    interval = setInterval(updateCountdown, 1000);
  });

   onUnmounted(() => {
    clearInterval(interval)
  })

  return { timeRemaining };
}
