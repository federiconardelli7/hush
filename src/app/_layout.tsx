import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PrivyProviderWrapper } from "@/features/auth/PrivyProviderWrapper";
import { ThemeProvider } from "@/design-system/theme";

const queryClient = new QueryClient();

// Provider stack. Privy (embedded wallet) is outermost so auth + wallet hooks
// work app-wide; the eERC provider mounts inside the signed-in group, and
// Supabase layers in during Stage B.
export default function RootLayout() {
  return (
    <PrivyProviderWrapper>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }} />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </PrivyProviderWrapper>
  );
}
