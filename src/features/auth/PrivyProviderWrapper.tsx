import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";
import { avalancheFuji } from "viem/chains";

// Outermost provider: gives the whole app a Privy embedded wallet via email OTP.
// EXPO_PUBLIC_* vars are inlined at build time; fail loud if the app id is absent
// so a misconfigured build breaks immediately rather than at first login.
const appId = process.env.EXPO_PUBLIC_PRIVY_APP_ID;
if (!appId) {
  throw new Error(
    "EXPO_PUBLIC_PRIVY_APP_ID is not set — add it to hush/.env before starting the app.",
  );
}
const PRIVY_APP_ID: string = appId;

export function PrivyProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email"],
        // Auto-create the EOA on first login; no seed phrase is shown to the user.
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
        },
        defaultChain: avalancheFuji,
        supportedChains: [avalancheFuji],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
