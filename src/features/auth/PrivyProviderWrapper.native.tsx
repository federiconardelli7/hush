import { PrivyProvider } from "@privy-io/expo";
import type { ReactNode } from "react";
import { avalancheFuji } from "viem/chains";

// Native (@privy-io/expo) counterpart of PrivyProviderWrapper.tsx (web).
// Mobile requires both an appId AND a clientId (a Privy "app client" registered
// for the bundle id / package in the dashboard). Fail loud if either is missing
// so a misconfigured build breaks immediately rather than at first login.
const appId = process.env.EXPO_PUBLIC_PRIVY_APP_ID;
const clientId = process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID;
if (!appId) {
  throw new Error(
    "EXPO_PUBLIC_PRIVY_APP_ID is not set — add it to hush/.env before building.",
  );
}
if (!clientId) {
  throw new Error(
    "EXPO_PUBLIC_PRIVY_CLIENT_ID is not set — create a mobile app client in the " +
      "Privy dashboard (Configuration → App settings → Clients) and add it to hush/.env.",
  );
}
const PRIVY_APP_ID: string = appId;
const PRIVY_CLIENT_ID: string = clientId;

// `supportedChains` is limited to Fuji, which also makes Fuji the embedded
// wallet's default chain (the SDK defaults the wallet to the first supportedChain),
// so the viem wallet client never needs an explicit switchChain. There is no
// `showWalletUIs`/`loginMethods` on native: the expo SDK has no default action
// modals (we drive Pay/Cash-out confirmation ourselves) and login methods are not
// provider-configured — the onboarding screens call the login hooks directly.
export function PrivyProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      clientId={PRIVY_CLIENT_ID}
      supportedChains={[avalancheFuji]}
    >
      {children}
    </PrivyProvider>
  );
}
