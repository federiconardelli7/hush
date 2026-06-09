import { usePrivy } from "@privy-io/react-auth";

// Normalized auth state, platform-split so shared route files never import a
// platform-specific Privy SDK directly (web: @privy-io/react-auth; native:
// @privy-io/expo — see useAuth.native.ts). Keeping this stable shape means the
// consumers (index / (signed-in)/_layout / onboarding/_layout / me) are identical
// on both platforms, and Metro keeps the web SDK out of the native bundle.
export type AuthState = {
  ready: boolean;
  authenticated: boolean;
  logout: () => void | Promise<void>;
};

export function useAuth(): AuthState {
  const { ready, authenticated, logout } = usePrivy();
  return { ready, authenticated, logout };
}
