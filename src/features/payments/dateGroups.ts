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

// US-format date + time for a desktop Activity row, e.g. "6/5/26, 4:01 PM".
export function formatRowDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Short date for a row, e.g. "8 Jun".
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

// Short relative time, e.g. "just now", "5m ago", "3h ago", "2d ago".
export function relativeShort(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// "Notify again" cooldown: returns "Notify in Xh" while a request was reminded < 24h
// ago, else null (a fresh nudge is allowed). null when never reminded.
export function notifyCooldown(
  lastRemindedAt: string | null | undefined,
  createdAt: string,
): string | null {
  // Cooldown runs from the last nudge, or from creation if never nudged — so a brand-new
  // request can't be nudged again immediately (creating it already pinged the other party).
  const base = lastRemindedAt ?? createdAt;
  const left = new Date(base).getTime() + 24 * 3_600_000 - Date.now();
  if (left <= 0) return null;
  const h = Math.ceil(left / 3_600_000);
  return h >= 1 ? `Notify in ${h}h` : "Notify soon";
}
