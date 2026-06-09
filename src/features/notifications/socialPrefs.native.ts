import { useSyncExternalStore } from "react";
import * as SecureStore from "expo-secure-store";

// Native counterpart of socialPrefs.ts — same reactive interface, backed by
// expo-secure-store's SYNCHRONOUS getItem/setItem so toggles persist across app
// restarts with no async hydration. secure-store keys can't contain ":", so the
// native key uses "_". See seen.native.ts for the storage rationale.
export type SocialPrefs = { likes: boolean; comments: boolean; mentions: boolean };

const DEFAULT: SocialPrefs = { likes: false, comments: false, mentions: true };
const storeKey = (address: string) =>
  `hush_social-notif-prefs_v1_${address.toLowerCase()}`;
const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string; prefs: SocialPrefs }>();

function readRaw(address: string): string {
  try {
    return SecureStore.getItem(storeKey(address)) ?? "";
  } catch {
    return "";
  }
}

function load(address: string): SocialPrefs {
  const raw = readRaw(address);
  const hit = cache.get(address);
  if (hit && hit.raw === raw) return hit.prefs;
  let prefs: SocialPrefs;
  try {
    prefs = raw
      ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<SocialPrefs>) }
      : DEFAULT;
  } catch {
    prefs = DEFAULT;
  }
  cache.set(address, { raw, prefs });
  return prefs;
}

export function setSocialPref(
  address: string | undefined,
  key: keyof SocialPrefs,
  value: boolean,
): void {
  if (!address) return;
  const current = load(address);
  if (current[key] === value) return;
  const next = { ...current, [key]: value };
  const raw = JSON.stringify(next);
  try {
    SecureStore.setItem(storeKey(address), raw);
  } catch {
    // best-effort; the cache below keeps the session consistent
  }
  cache.set(address, { raw, prefs: next });
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSocialPrefs(address: string | undefined): SocialPrefs {
  return useSyncExternalStore(
    subscribe,
    () => (address ? load(address) : DEFAULT),
    () => DEFAULT,
  );
}
