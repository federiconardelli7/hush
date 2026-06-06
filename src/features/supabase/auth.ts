import type { WalletClient } from "viem";
import { setSupabaseToken } from "@/features/supabase/client";

// Prod: same-origin Vercel `/api` functions. Local dev: set EXPO_PUBLIC_FAUCET_URL
// to the dev faucet (http://localhost:8788).
const BACKEND_URL = process.env.EXPO_PUBLIC_FAUCET_URL ?? "/api";

// Binds the embedded wallet to Supabase: prove control of the EOA by signing a
// single-use server nonce, then exchange the signature for a Supabase JWT that
// carries the `wallet_address` claim RLS expects. No password, no Supabase Auth
// user — the wallet is the identity.
export async function signInToSupabase(
  walletClient: WalletClient,
  address: `0x${string}`,
): Promise<void> {
  const nonceRes = await fetch(`${BACKEND_URL}/auth/nonce`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!nonceRes.ok) {
    throw new Error(`Auth nonce request failed (${nonceRes.status}).`);
  }
  const { nonce, message } = (await nonceRes.json()) as {
    nonce: string;
    message: string;
  };

  const signature = await walletClient.signMessage({ account: address, message });

  const tokenRes = await fetch(`${BACKEND_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, nonce, signature }),
  });
  if (!tokenRes.ok) {
    const body = (await tokenRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Auth token request failed (${tokenRes.status}).`);
  }
  // Note: the minted JWT expires in ~1h and is not auto-refreshed — after that, writes
  // fail until the next sign-in (e.g. page reload re-runs this). Acceptable for the demo;
  // a refresh-before-expiry pass belongs with key persistence (F-2).
  const { token } = (await tokenRes.json()) as { token: string };
  setSupabaseToken(token);
}
