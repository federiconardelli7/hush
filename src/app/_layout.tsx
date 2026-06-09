import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { WagmiProvider } from "wagmi";
import { PrivyProviderWrapper } from "@/features/auth/PrivyProviderWrapper";
import { ThemeProvider } from "@/design-system/theme";
import { ProverHost } from "@/features/eerc/prover/ProverHost";
import { wagmiConfig } from "@/features/wallet/wagmiConfig";

const queryClient = new QueryClient();

// Provider stack. Privy (embedded wallet) is outermost so auth + wallet hooks
// work app-wide; WagmiProvider wraps the query client because the eERC SDK uses
// wagmi hooks internally. The eERC provider mounts inside the signed-in group,
// and Supabase layers in during Stage B.
export default function RootLayout() {
  return (
    <PrivyProviderWrapper>
      <SafeAreaProvider>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <StatusBar style="auto" />
              {/* Native-only ZK prover WebView (null on web) — at the root so the
                  onboarding register proof can run before sign-in completes. */}
              <ProverHost />
              <Stack screenOptions={{ headerShown: false }} />
            </ThemeProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </SafeAreaProvider>
    </PrivyProviderWrapper>
  );
}
