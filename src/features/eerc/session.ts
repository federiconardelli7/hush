// Session cache for the BabyJubJub decryption key. The key is derived from a
// wallet signature (deterministic per EOA) and decrypts balances + memos — it
// is NEVER uploaded anywhere. Web keeps it in memory for the tab session;
// native will swap this module for an expo-secure-store-backed one behind the
// same interface. Keyed by lowercased address so a re-login reuses it.
const keys = new Map<string, string>();

const norm = (address: string) => address.toLowerCase();

export function getCachedDecryptionKey(address: string): string | undefined {
  return keys.get(norm(address));
}

export function cacheDecryptionKey(address: string, key: string): void {
  keys.set(norm(address), key);
}

export function clearDecryptionKey(address: string): void {
  keys.delete(norm(address));
}
