import { usePrivy } from "@privy-io/expo";

// Native (@privy-io/expo) counterpart of useAuth.ts (web). The expo SDK's usePrivy
// exposes `isReady` + `user` (no `ready`/`authenticated`), so normalize to the same
// shape the web variant returns. Consumers stay identical across platforms.
export type AuthState = {
  ready: boolean;
  authenticated: boolean;
  logout: () => void | Promise<void>;
};

export function useAuth(): AuthState {
  const { isReady, user, logout } = usePrivy();
  return { ready: isReady, authenticated: user !== null, logout };
}
