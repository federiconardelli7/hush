import { useEffect, useRef, useState } from "react";
import type { WalletClient } from "viem";
import { signInToSupabase } from "@/features/supabase/auth";
import { setReauthProvider, supabase } from "@/features/supabase/client";

export type SupabaseStatus = "idle" | "signing" | "ready" | "error";

export type SupabaseSession = {
  status: SupabaseStatus;
  // The wallet RLS sees (from current_wallet()); confirms the claim round-trips.
  boundWallet: string | null;
  error: string | null;
};

// Binds the wallet to Supabase exactly once per address, then verifies the
// binding by asking the DB what wallet it sees (`current_wallet()` RPC reads the
// JWT claim). A mismatch or error means RLS would reject writes.
export function useSupabaseSession(
  walletClient: WalletClient | null,
  address: `0x${string}` | null,
): SupabaseSession {
  const [status, setStatus] = useState<SupabaseStatus>("idle");
  const [boundWallet, setBoundWallet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const boundFor = useRef<string | null>(null);

  useEffect(() => {
    if (!walletClient || !address || boundFor.current === address) {
      return;
    }
    boundFor.current = address;
    // Let the supabase client silently re-mint this wallet's JWT when it expires
    // (the embedded wallet signs without a prompt — showWalletUIs:false), so an
    // idle tab keeps writing instead of failing with "JWT expired".
    setReauthProvider(() => signInToSupabase(walletClient, address));
    setStatus("signing");
    setError(null);

    void (async () => {
      try {
        await signInToSupabase(walletClient, address);
        const { data, error: rpcError } = await supabase.rpc("current_wallet");
        if (rpcError) {
          throw new Error(rpcError.message);
        }
        const seen = typeof data === "string" ? data : null;
        if (seen !== address.toLowerCase()) {
          throw new Error(
            `RLS sees ${seen ?? "no wallet"}, expected ${address.toLowerCase()}.`,
          );
        }
        setBoundWallet(seen);
        setStatus("ready");
      } catch (err) {
        boundFor.current = null; // allow a retry on a later render
        setStatus("error");
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [walletClient, address]);

  return { status, boundWallet, error };
}
