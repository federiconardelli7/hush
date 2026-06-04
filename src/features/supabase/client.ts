import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not set in hush/.env.",
  );
}

// The wallet-derived Supabase JWT (minted by the dev backend), set after sign-in.
let currentToken: string | null = null;

export function setSupabaseToken(token: string | null): void {
  currentToken = token;
}

// supabase-js calls this for every request. While null, requests fall back to
// the anon key (public reads still work); once a wallet token is set, writes run
// as that wallet (RLS reads its `wallet_address` claim). Using `accessToken`
// means we manage the session ourselves — supabase-js's own auth is bypassed.
export const supabase = createClient(url, anonKey, {
  accessToken: async () => currentToken,
});
