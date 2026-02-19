export function useXpAnimation() {
  const xpDelta = ref<number | null>(null);
  const mergingXp = ref(false);
  const readyForNext = ref(false);

  function triggerXp(delta: number, isLast: boolean) {
    xpDelta.value = delta;
    readyForNext.value = false;

    setTimeout(() => {
      mergingXp.value = true;

      setTimeout(() => {
        xpDelta.value = null;
        mergingXp.value = false;

        if (!isLast) {
          readyForNext.value = true;
        }
      }, 220);
    }, 1000);
  }

  return {
    xpDelta,
    mergingXp,
    readyForNext,
    triggerXp,
  };
}
