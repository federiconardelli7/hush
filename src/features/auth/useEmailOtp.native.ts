import { useCallback, useState } from "react";
import { useLoginWithEmail } from "@privy-io/expo";

export type OtpStatus =
  | "idle"
  | "sending-code"
  | "code-sent"
  | "verifying"
  | "error";

// Native (@privy-io/expo) counterpart of useEmailOtp.ts (web), exposing the same
// { status, error, requestCode, submitCode } shape so the onboarding screens are
// unchanged. The one difference: expo's loginWithCode requires the email too
// (web infers it from the client flow), so we remember it across the email →
// verify screen hop at module scope — the screens are separate hook instances.
let pendingEmail = "";

export function useEmailOtp() {
  const { sendCode, loginWithCode } = useLoginWithEmail();
  const [status, setStatus] = useState<OtpStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const requestCode = useCallback(
    async (email: string) => {
      setError(null);
      setStatus("sending-code");
      try {
        await sendCode({ email });
        pendingEmail = email;
        setStatus("code-sent");
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Could not send the code.");
        throw err;
      }
    },
    [sendCode],
  );

  const submitCode = useCallback(
    async (code: string) => {
      setError(null);
      setStatus("verifying");
      try {
        await loginWithCode({ code, email: pendingEmail });
        // On success Privy sets the user and the embedded wallet is created;
        // navigation is driven off that state by the caller.
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "That code didn't work.");
        throw err;
      }
    },
    [loginWithCode],
  );

  return { status, error, requestCode, submitCode };
}
