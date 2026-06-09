import { useCallback, useState } from "react";
import { useLoginWithOAuth } from "@privy-io/expo";

export type OAuthStatus = "idle" | "redirecting" | "error";

const GENERIC_ERROR =
  "Google sign-in didn't complete. Please try again or use email.";

// Native (@privy-io/expo) counterpart of useGoogleAuth.ts (web), same
// { status, error, signIn } shape so onboarding is unchanged. On native the expo
// SDK opens an in-app browser (via expo-web-browser) and returns through the app's
// `hush://` scheme; `login` resolves once the whole flow completes (unlike the web
// SDK's `initOAuth`, which resolves when the redirect merely starts). Failures
// surface via both the awaited rejection and the onError callback → one friendly
// message, never a raw SDK string. On success Privy sets the user and
// onboarding/_layout redirects into the app — identical to the email path.
export function useGoogleAuth() {
  const [status, setStatus] = useState<OAuthStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const { login } = useLoginWithOAuth({
    onError: () => {
      setStatus("error");
      setError(GENERIC_ERROR);
    },
  });

  const signIn = useCallback(async () => {
    setError(null);
    setStatus("redirecting");
    try {
      await login({ provider: "google" });
    } catch {
      setStatus("error");
      setError(GENERIC_ERROR);
    }
  }, [login]);

  return { status, error, signIn };
}
