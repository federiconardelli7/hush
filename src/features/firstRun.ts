// Whether the one-time welcome guide has been shown to this wallet, client-side only
// (localStorage on web; in-memory on native), per-address — mirrors seen.ts / socialPrefs.
const storeKey = (address: string) => `hush:first-run-seen:v1:${address.toLowerCase()}`;
const mem = new Set<string>();

const hasLocalStorage = () =>
  typeof window !== "undefined" && !!window.localStorage;

export function hasSeenFirstRun(address: string): boolean {
  if (hasLocalStorage()) {
    return window.localStorage.getItem(storeKey(address)) === "1";
  }
  return mem.has(address.toLowerCase());
}

export function markFirstRunSeen(address: string): void {
  if (hasLocalStorage()) {
    window.localStorage.setItem(storeKey(address), "1");
  } else {
    mem.add(address.toLowerCase());
  }
}
