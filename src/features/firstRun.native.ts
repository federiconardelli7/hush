import * as SecureStore from "expo-secure-store";

// Native counterpart of firstRun.ts — backed by expo-secure-store's SYNCHRONOUS
// getItem/setItem so the one-time welcome guide doesn't reappear after an app restart
// (the in-memory fallback would re-show it every cold start). secure-store keys can't
// contain ":", so the native key uses "_".
const storeKey = (address: string) => `hush_first-run-seen_v1_${address.toLowerCase()}`;

export function hasSeenFirstRun(address: string): boolean {
  try {
    return SecureStore.getItem(storeKey(address)) === "1";
  } catch {
    return false;
  }
}

export function markFirstRunSeen(address: string): void {
  try {
    SecureStore.setItem(storeKey(address), "1");
  } catch {
    // best-effort
  }
}
