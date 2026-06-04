import { useSyncExternalStore } from "react";

// Reactive "last seen notifications" timestamp per wallet, persisted to localStorage
// on web so the Home bell badge and the notifications screen stay in sync without a
// DB column. Native (no window) falls back to in-memory for the session.
const key = (address: string) => `hush:notifs-seen:${address.toLowerCase()}`;
const mem = new Map<string, number>();
const listeners = new Set<() => void>();

const hasLocalStorage = () =>
  typeof window !== "undefined" && !!window.localStorage;

export function getLastSeen(address: string): number {
  if (!address) return 0;
  if (hasLocalStorage()) {
    const v = window.localStorage.getItem(key(address));
    return v ? Number(v) : 0;
  }
  return mem.get(address.toLowerCase()) ?? 0;
}

export function markSeen(address: string): void {
  if (!address) return;
  const now = Date.now();
  if (hasLocalStorage()) {
    window.localStorage.setItem(key(address), String(now));
  } else {
    mem.set(address.toLowerCase(), now);
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Reactive read — re-renders when markSeen fires (e.g. the Home bell clears after the
// notifications screen marks them read).
export function useLastSeen(address: string | undefined): number {
  return useSyncExternalStore(
    subscribe,
    () => (address ? getLastSeen(address) : 0),
    () => 0,
  );
}
