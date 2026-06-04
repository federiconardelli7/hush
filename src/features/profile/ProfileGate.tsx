import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useTheme } from "@/design-system/theme";
import { useEerc } from "@/features/eerc/useEerc";
import { ProfileSetup } from "@/features/profile/ProfileSetup";
import { useProfile } from "@/features/profile/useProfile";

// Blocks the signed-in app until the wallet has a Supabase profile. Writes need
// the auth binding, so it waits for that first; if binding failed it lets the
// user through (the error surfaces in Me) rather than trapping them.
export function ProfileGate({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const { address, supabaseStatus } = useEerc();
  const profile = useProfile(supabaseStatus === "ready" ? address : null);

  if (supabaseStatus === "error") {
    return <>{children}</>;
  }
  if (supabaseStatus !== "ready" || profile.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.actBlue} />
      </View>
    );
  }
  if (address && !profile.data) {
    return <ProfileSetup address={address} />;
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
