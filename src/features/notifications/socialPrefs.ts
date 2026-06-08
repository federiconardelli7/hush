import { useSyncExternalStore } from "react";

// Per-address social-notification preferences, client-side only (localStorage on web;
// in-memory on native), reactive via useSyncExternalStore — mirrors seen.ts. Both default
// OFF: by design, likes/comments on your payments don't notify you until you opt in
// (Settings → Notifications). Money received + requests always notify (separate kinds).
export type SocialPrefs = { likes: boolean; comments: boolean };

const DEFAULT: SocialPrefs = { likes: false, comments: false };
const storeKey = (address: string) => `hush:social-notif-prefs:v1:${address.toLowerCase()}`;
const mem = new Map<string, SocialPrefs>();
const listeners = new Set<() => void>();

// Cache the parsed prefs per address keyed on the raw string so getSnapshot stays
// referentially stable between renders (a new object only when the value changes).
const cache = new Map<string, { raw: string; prefs: SocialPrefs }>();

const hasLocalStorage = () =>
  typeof window !== "undefined" && !!window.localStorage;

function load(address: string): SocialPrefs {
  if (hasLocalStorage()) {
    const raw = window.localStorage.getItem(storeKey(address)) ?? "";
    const hit = cache.get(address);
    if (hit && hit.raw === raw) return hit.prefs;
    let prefs: SocialPrefs;
    try {
      prefs = raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<SocialPrefs>) } : DEFAULT;
    } catch {
      prefs = DEFAULT;
    }
    cache.set(address, { raw, prefs });
    return prefs;
  }
  return mem.get(address) ?? DEFAULT;
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
  if (hasLocalStorage()) {
    const raw = JSON.stringify(next);
    window.localStorage.setItem(storeKey(address), raw);
    cache.set(address, { raw, prefs: next });
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

// Reactive prefs for the current wallet — re-renders the Settings toggles and re-keys
// useNotifications (so toggling on/off re-derives the inbox) when setSocialPref fires.
export function useSocialPrefs(address: string | undefined): SocialPrefs {
  return useSyncExternalStore(
    subscribe,
    () => (address ? load(address) : DEFAULT),
    () => DEFAULT,
  );
}
