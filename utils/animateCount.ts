export function animateCount(
    target: Ref<number>,
    endValue: number,
    duration = 2000
) {
    const startValue = 0
    const startTime = performance.now()

    function update(now: number) {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)

        // easeOutCubic (smooth finish)
        const eased = 1 - Math.pow(1 - progress, 4)

        target.value = Math.floor(startValue + (endValue - startValue) * eased)

        if (progress < 1) {
            requestAnimationFrame(update)
        } else {
            target.value = endValue
        }
    }

    requestAnimationFrame(update)
}