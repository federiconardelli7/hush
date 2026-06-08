import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";
import { avalancheFuji } from "viem/chains";

// Outermost provider: gives the whole app a Privy embedded wallet via email OTP or Google.
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
        loginMethods: ["email", "google"],
        // Auto-create the EOA on first login; no seed phrase is shown to the user.
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
          // The embedded wallet is already unlocked by the user's email-OTP
          // session, and Hush has its own in-app confirmation screens (Pay /
          // Cash out), so Privy's per-action signature/tx modals are redundant.
          // Off for a web2 feel; the wallet still signs client-side — no key or
          // privacy impact (the decryption key stays client-held). See D-33.
          showWalletUIs: false,
        },
        defaultChain: avalancheFuji,
        supportedChains: [avalancheFuji],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
