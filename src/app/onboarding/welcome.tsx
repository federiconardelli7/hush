import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";
import { useGoogleAuth } from "@/features/auth/useGoogleAuth";

// Brand + privacy promise, then the two ways in: Google (one-tap OAuth redirect)
// or email OTP. Privy resolves new and returning users through one flow for both,
// and the embedded wallet is created the same way regardless of method.
export default function Welcome() {
  const { colors } = useTheme();
  const { status, error, signIn } = useGoogleAuth();
  const connecting = status === "redirecting";

  const toEmail = () => router.push("/onboarding/email");
  const onGoogle = () => {
    if (connecting) return;
    void signIn();
  };

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <Text style={[typeScale.balanceHero, { color: colors.ink }]}>Hush</Text>
        <Text style={[styles.tagline, { color: colors.sub }]}>
          Pay friends privately. Amounts stay hidden — always.
        </Text>
      </View>
      <View style={styles.actions}>
        <Button
          label={connecting ? "Connecting…" : "Continue with Google"}
          variant="primary"
          onPress={onGoogle}
        />
        <Button label="Continue with email" variant="ghost" onPress={toEmail} />
        {error ? (
          <Text style={[styles.error, { color: colors.avRed }]}>{error}</Text>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, justifyContent: "center", gap: spacing.md },
  tagline: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 23, maxWidth: 320 },
  actions: { paddingBottom: spacing.xl, gap: spacing.sm },
  error: { fontFamily: fonts.ui, fontSize: 13, textAlign: "center" },
});
