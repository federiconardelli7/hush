// Session cache for the BabyJubJub decryption key. The key is derived from a
// wallet signature (deterministic per EOA) and decrypts balances + memos — it
// is NEVER uploaded anywhere (no server can read amounts; that's the privacy
// invariant). On web it persists to sessionStorage so a page reload keeps the
// balance unlocked (resolves F-2) while still expiring when the tab/window
// closes; sign-out clears it (me.tsx). Plaintext is acceptable: the real browser
// threat is in-page XSS — which no storage choice defends against — the key is
// silently re-derivable, and it exposes confidentiality only (never funds).
// Native swaps this module for an expo-secure-store-backed one behind the same
// sync interface (D-33; see ARCHITECTURE.md). Keyed by lowercased address.
const mem = new Map<string, string>();

const norm = (address: string) => address.toLowerCase();
const storeKey = (address: string) => `hush:eerc-dk:v1:${norm(address)}`;

// sessionStorage access can throw (incognito / blocked storage / non-web) — in
// that case we fall back to the in-memory map (the app just re-signs on reload).
function session(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      return window.sessionStorage;
    }
  } catch {
    // storage blocked — fall back to memory
  }
  return null;
}

export function getCachedDecryptionKey(address: string): string | undefined {
  const store = session();
  if (store) {
    try {
      return store.getItem(storeKey(address)) ?? mem.get(norm(address));
    } catch {
      // fall through to memory
    }
  }
  return mem.get(norm(address));
}

export function cacheDecryptionKey(address: string, key: string): void {
  mem.set(norm(address), key);
  const store = session();
  if (store) {
    try {
      store.setItem(storeKey(address), key);
    } catch {
      // memory copy already holds it for this tab
    }
  }
}

export function clearDecryptionKey(address: string): void {
  mem.delete(norm(address));
  const store = session();
  if (store) {
    try {
      store.removeItem(storeKey(address));
    } catch {
      // nothing else to do
    }
  }
}
