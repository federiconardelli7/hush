import type { WalletClient } from "viem";
import { setSupabaseToken } from "@/features/supabase/client";
import { backendBaseUrl } from "@/features/backend/baseUrl";

// Same-origin Vercel `/api` in prod; the dev faucet (http://localhost:8788) only
// when served from localhost — see backendBaseUrl.
const BACKEND_URL = backendBaseUrl();

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
  // The minted JWT expires in ~1h. This function is reused as the client's reauth
  // provider (see client.ts / useSupabaseSession.ts): when the token is near expiry,
  // the supabase accessToken callback calls this again to silently re-sign + re-mint,
  // so an idle tab keeps writing rather than failing with "JWT expired".
  const { token } = (await tokenRes.json()) as { token: string };
  setSupabaseToken(token);
}
