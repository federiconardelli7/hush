import { useCallback, useState } from "react";
import { useLoginWithOAuth } from "@privy-io/react-auth";

export type OAuthStatus = "idle" | "redirecting" | "error";

const GENERIC_ERROR =
  "Google sign-in didn't complete. Please try again or use email.";

// Thin, typed wrapper over Privy's headless OAuth login, mirroring useEmailOtp.
// `initOAuth` navigates the page to Google and its promise resolves once the
// redirect *starts*, so the try/catch only surfaces start failures (e.g. Google
// not yet enabled in the Privy dashboard). The *return* outcome — a denied consent
// or provider error after coming back — is delivered through Privy's onError
// callback (which passes a PrivyErrorCode, not an Error), so we consume both and
// show one friendly message rather than a raw SDK string. On success Privy flips
// `authenticated`, creates the embedded wallet, and onboarding/_layout redirects
// into the app — identical to the email-OTP path.
export function useGoogleAuth() {
  const [status, setStatus] = useState<OAuthStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const { initOAuth } = useLoginWithOAuth({
    onError: () => {
      setStatus("error");
      setError(GENERIC_ERROR);
    },
  });

  const signIn = useCallback(async () => {
    setError(null);
    setStatus("redirecting");
    try {
      await initOAuth({ provider: "google" });
    } catch {
      setStatus("error");
      setError(GENERIC_ERROR);
    }
  }, [initOAuth]);

  return { status, error, signIn };
}
