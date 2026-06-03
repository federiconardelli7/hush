import { usePrivy } from "@privy-io/react-auth";
import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useTheme } from "@/design-system/theme";

// Entry gate: wait for Privy to hydrate, then route authenticated users into
// the app and everyone else into onboarding.
export default function Index() {
  const { ready, authenticated } = usePrivy();
  const { colors } = useTheme();

  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.actBlue} />
      </View>
    );
  }

  return (
    <Redirect href={authenticated ? "/home" : "/onboarding/welcome"} />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
