import { useCallback, useState } from "react";
import { useLoginWithEmail } from "@privy-io/react-auth";

export type OtpStatus =
  | "idle"
  | "sending-code"
  | "code-sent"
  | "verifying"
  | "error";

// Thin, typed wrapper over Privy's headless email-OTP login. The onboarding
// screens drive a custom UI (matching the design system) instead of Privy's
// modal, so they only need a single status + error string here.
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
        await loginWithCode({ code });
        // On success Privy flips `authenticated` to true and creates the
        // embedded wallet; navigation is driven off that state by the caller.
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
