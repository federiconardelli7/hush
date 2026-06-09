import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not set in hush/.env.",
  );
}

// The wallet-derived Supabase JWT (minted by our backend), set after sign-in.
let currentToken: string | null = null;
// Re-mints the JWT (re-sign nonce → /api/auth/token). Registered once the wallet
// is bound (useSupabaseSession); lets the accessToken callback silently refresh an
// expiring token instead of waiting for a page reload. Cleared on sign-out.
let reauth: (() => Promise<void>) | null = null;
// Dedupes concurrent refreshes so a burst of requests triggers a single re-mint.
let refreshing: Promise<void> | null = null;

// Refresh when the token is within this many seconds of expiry (clock-skew headroom).
const EXPIRY_SKEW_S = 60;

export function setSupabaseToken(token: string | null): void {
  currentToken = token;
}

export function setReauthProvider(fn: (() => Promise<void>) | null): void {
  reauth = fn;
}

// Reads `exp` (unix seconds) from a JWT payload WITHOUT verifying the signature —
// we only need the expiry to decide whether to refresh. Returns null for a
// missing/malformed token, which we treat as "needs refresh".
function tokenExp(token: string | null): number | null {
  const part = token?.split(".")[1];
  if (!part) return null;
  try {
    let b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad) b64 += "=".repeat(4 - pad);
    // Buffer (set globally in polyfills.js) decodes base64 on both web and native;
    // `atob` isn't available on React Native's Hermes engine.
    const payload = JSON.parse(
      Buffer.from(b64, "base64").toString("utf-8"),
    ) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

function isFresh(token: string | null): boolean {
  const exp = tokenExp(token);
  if (exp === null) return false;
  return exp - Math.floor(Date.now() / 1000) > EXPIRY_SKEW_S;
}

// supabase-js calls this for EVERY request. While null we use the anon key (public
// reads still work); otherwise we return the wallet token — transparently re-minting
// it first if it's expired or about to be, so an idle tab no longer fails writes with
// "JWT expired". RLS reads the token's `wallet_address` claim.
async function accessToken(): Promise<string | null> {
  if (!currentToken) return null;
  if (isFresh(currentToken)) return currentToken;
  if (reauth) {
    refreshing ??= reauth().finally(() => {
      refreshing = null;
    });
    try {
      await refreshing;
    } catch {
      // Re-mint failed (e.g. the Privy session itself expired) — fall through with
      // the stale token so the request fails honestly and the caller can handle it.
    }
  }
  return currentToken;
}

// Using `accessToken` (not a static Authorization header) means we manage the session
// ourselves — supabase-js's own auth is bypassed (the recommended path for a self-minted JWT).
export const supabase = createClient(url, anonKey, { accessToken });
