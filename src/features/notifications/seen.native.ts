import { useSyncExternalStore } from "react";
import * as SecureStore from "expo-secure-store";

// Native counterpart of seen.ts — identical reactive interface, backed by
// expo-secure-store's SYNCHRONOUS getItem/setItem (SDK 53+) so the sync contract is
// preserved with no async hydration (no cold-start flicker). The read-set isn't a
// secret, but secure-store is the only synchronous key/value store that matches the
// interface, and the values stay small. secure-store keys can't contain ":", so the
// native key uses "_".
const storeKey = (address: string) => `hush_notifs-read_v2_${address.toLowerCase()}`;
const listeners = new Set<() => void>();
const EMPTY: ReadonlySet<string> = new Set();

// Cache the parsed Set per address keyed on the raw string so getSnapshot stays
// referentially stable between renders.
const cache = new Map<string, { raw: string; set: Set<string> }>();

function readRaw(address: string): string {
  try {
    return SecureStore.getItem(storeKey(address)) ?? "";
  } catch {
    return "";
  }
}

function load(address: string): Set<string> {
  const raw = readRaw(address);
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

export function markRead(address: string | undefined, ids: string[]): void {
  if (!address || ids.length === 0) return;
  const current = load(address);
  const next = new Set(current);
  for (const id of ids) next.add(id);
  if (next.size === current.size) return;
  const raw = JSON.stringify([...next]);
  try {
    SecureStore.setItem(storeKey(address), raw);
  } catch {
    // best-effort; the cache below keeps the session consistent
  }
  cache.set(address, { raw, set: next });
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useReadIds(address: string | undefined): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribe,
    () => (address ? load(address) : EMPTY),
    () => EMPTY,
  );
}
