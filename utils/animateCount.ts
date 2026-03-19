import type { Ref } from "vue";

export function animateCount(
  target: Ref<number>,
  endValue: number,
  duration = 2000,
  startValue = 0,
) {
  const startTime = performance.now();

  function update(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const eased = 1 - Math.pow(1 - progress, 4);
    const rawValue = startValue + (endValue - startValue) * eased;

    target.value =
      endValue < startValue ? Math.ceil(rawValue) : Math.floor(rawValue);

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      target.value = endValue;
    }
  }

  requestAnimationFrame(update);
}
