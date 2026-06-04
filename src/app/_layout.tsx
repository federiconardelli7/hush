import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { WagmiProvider } from "wagmi";
import { PrivyProviderWrapper } from "@/features/auth/PrivyProviderWrapper";
import { ThemeProvider } from "@/design-system/theme";
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
              <Stack screenOptions={{ headerShown: false }} />
            </ThemeProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </SafeAreaProvider>
    </PrivyProviderWrapper>
  );
}
