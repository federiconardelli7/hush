import { useState } from "react";
import { useEerc } from "@/features/eerc/useEerc";
import { friendlyTxError } from "@/lib/txError";

// Moving funds to an EXTERNAL address is two on-chain steps, because eERC's withdraw
// only ever pays out to the caller's own wallet:
//   1. withdraw  — private (encrypted) balance → your public wallet  ("cashing")
//   2. transfer  — public ERC20 → the external address               ("sending")
// If step 1 fails, nothing moved (back to "idle"). If step 2 fails AFTER step 1, the
// funds are sitting safely in the user's public wallet — we surface that and let them
// retry ONLY the transfer (no second withdraw). Nothing is ever lost.
export type MoveOutPhase = "idle" | "cashing" | "sending" | "done" | "transfer-failed";

export function useMoveOut() {
  const { withdraw, sendErc20Out } = useEerc();
  const [phase, setPhase] = useState<MoveOutPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  // Step 2 in isolation — also the retry path once funds are already in the wallet.
  const transfer = async (to: string, amount: string, token: string) => {
    setError(null);
    setPhase("sending");
    try {
      const { transactionHash } = await sendErc20Out(to, amount, token);
      setTxHash(transactionHash);
      setPhase("done");
    } catch (err) {
      setError(
        friendlyTxError(err, {
          insufficient: "Not enough in your wallet to send.",
          fallback: "The transfer didn't go through.",
        }),
      );
      setPhase("transfer-failed");
    }
  };

  // Full move-out: cash out of the private balance, then send the token out.
  const run = async (to: string, amount: string, token: string) => {
    setTxHash(null);
    setError(null);
    setPhase("cashing");
    try {
      await withdraw(amount, token);
    } catch (err) {
      // Withdraw failed → nothing moved; reset so the user can adjust and retry.
      setError(
        friendlyTxError(err, {
          insufficient: "That's more than your balance.",
          fallback: "Couldn't move your funds out. Please try again.",
        }),
      );
      setPhase("idle");
      return;
    }
    await transfer(to, amount, token);
  };

  // Retry just the transfer (the withdraw already succeeded).
  const retry = (to: string, amount: string, token: string) => transfer(to, amount, token);

  return { phase, error, txHash, run, retry };
}
