import { useSyncExternalStore } from "react";

// Per-notification read state, client-side only (localStorage on web; in-memory on
// native), reactive via useSyncExternalStore. No DB column (keeps D-26). A notification's
// key is its `id` (kind-prefixed, see useNotifications) — a request that gets nudged
// ("Notify again") changes its id, so it re-appears as unread.
// v2: the read model changed from "mark-all-on-leave" to per-item / Mark-all-read, so
// the key is bumped to discard the over-eager read-set the old behaviour persisted.
const storeKey = (address: string) => `hush:notifs-read:v2:${address.toLowerCase()}`;
const mem = new Map<string, Set<string>>();
const listeners = new Set<() => void>();
const EMPTY: ReadonlySet<string> = new Set();

// Cache the parsed Set per address so getSnapshot stays referentially stable between
// notifications — a new reference is created only when the set actually changes.
const cache = new Map<string, { raw: string; set: Set<string> }>();

const hasLocalStorage = () =>
  typeof window !== "undefined" && !!window.localStorage;

function load(address: string): Set<string> {
  if (hasLocalStorage()) {
    const raw = window.localStorage.getItem(storeKey(address)) ?? "";
    const hit = cache.get(address);
    if (hit && hit.raw === raw) return hit.set;
    let set: Set<string>;
    try {
      set = new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      set = new Set();
    }
    cache.set(address, { raw, set });
    return set;
  }
  return mem.get(address) ?? new Set();
}

// Mark one or more notification ids read. No-op when nothing changes (keeps the snapshot
// reference stable so useSyncExternalStore doesn't loop).
export function markRead(address: string | undefined, ids: string[]): void {
  if (!address || ids.length === 0) return;
  const current = load(address);
  const next = new Set(current);
  for (const id of ids) next.add(id);
  if (next.size === current.size) return;
  if (hasLocalStorage()) {
    const raw = JSON.stringify([...next]);
    window.localStorage.setItem(storeKey(address), raw);
    cache.set(address, { raw, set: next });
  } else {
    mem.set(address, next);
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Reactive read-set for the current wallet — re-renders when markRead fires (e.g. the
// Home bell badge clears after the notifications screen marks everything read).
export function useReadIds(address: string | undefined): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribe,
    () => (address ? load(address) : EMPTY),
    () => EMPTY,
  );
}
