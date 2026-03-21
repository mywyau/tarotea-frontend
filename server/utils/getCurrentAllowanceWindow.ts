function addMonthsUTC(date: Date, months: number): Date {
  const d = new Date(date);
  const originalDay = d.getUTCDate();

  d.setUTCMonth(d.getUTCMonth() + months);

  if (d.getUTCDate() < originalDay) {
    d.setUTCDate(0);
  }

  return d;
}

export function getCurrentAllowanceWindow(
  currentPeriodStartIso: string,
  now = new Date()
): { windowStart: Date; windowEnd: Date } {
  const anchor = new Date(currentPeriodStartIso);

  let windowStart = anchor;
  let windowEnd = addMonthsUTC(anchor, 1);

  while (now >= windowEnd) {
    windowStart = windowEnd;
    windowEnd = addMonthsUTC(windowStart, 1);
  }

  return { windowStart, windowEnd };
}