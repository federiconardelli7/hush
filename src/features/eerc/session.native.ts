import * as SecureStore from "expo-secure-store";

// Native counterpart of session.ts — the BabyJubJub decryption key cache, backed by
// expo-secure-store's SYNCHRONOUS getItem/setItem (SDK 53+) so the sync interface is
// preserved (getCachedDecryptionKey runs in EercProvider's useState initializer at
// mount). secure-store is hardware-backed (iOS Keychain / Android Keystore) — the
// correct home for this secret (the F-15 hardening) — and a synchronous cold-start
// read means the balance unlocks instantly with no re-derivation. An in-memory map
// mirrors the value so a secure-store hiccup still keeps the session consistent.
// secure-store keys can't contain ":", so the native key uses "_". Cleared on sign-out.
const mem = new Map<string, string>();

const norm = (address: string) => address.toLowerCase();
const storeKey = (address: string) => `hush_eerc-dk_v1_${norm(address)}`;

export function getCachedDecryptionKey(address: string): string | undefined {
  const inMem = mem.get(norm(address));
  if (inMem) return inMem;
  try {
    const stored = SecureStore.getItem(storeKey(address));
    if (stored) {
      mem.set(norm(address), stored);
      return stored;
    }
  } catch {
    // secure-store unavailable — treat as no cached key (the app re-derives silently)
  }
  return undefined;
}

export function cacheDecryptionKey(address: string, key: string): void {
  mem.set(norm(address), key);
  try {
    SecureStore.setItem(storeKey(address), key);
  } catch {
    // in-memory copy holds it for this session
  }
}

export function clearDecryptionKey(address: string): void {
  mem.delete(norm(address));
  // Remove the secret from the keystore on sign-out (async; the in-memory wipe above
  // is what matters immediately).
  void SecureStore.deleteItemAsync(storeKey(address)).catch(() => {});
}
