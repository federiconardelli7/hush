export type DateGroup<T> = { label: string; items: T[] };

const DAY = 86_400_000;

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Bucket payment-like items (assumed newest-first) into Today / Yesterday /
// This week / Earlier by created_at. Input order is preserved within a bucket,
// and empty buckets are dropped. Pure — `now` is injectable for tests.
export function groupByDate<T extends { created_at: string }>(
  items: T[],
  now: number = Date.now(),
): DateGroup<T>[] {
  const today = startOfDay(now);
  const yesterday = today - DAY;
  const weekStart = today - 6 * DAY; // last 7 days, today included
  const buckets: Record<string, T[]> = {
    Today: [],
    Yesterday: [],
    "This week": [],
    Earlier: [],
  };
  for (const item of items) {
    const t = new Date(item.created_at).getTime();
    if (t >= today) buckets.Today.push(item);
    else if (t >= yesterday) buckets.Yesterday.push(item);
    else if (t >= weekStart) buckets["This week"].push(item);
    else buckets.Earlier.push(item);
  }
  return Object.entries(buckets)
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => ({ label, items: list }));
}

// Time of day for a row, e.g. "2:14 PM".
export function formatTimeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
