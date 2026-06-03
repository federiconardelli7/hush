import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";

// Brand + privacy promise. Both buttons go to the same email screen — Privy's
// email OTP handles new and returning users through one flow.
export default function Welcome() {
  const { colors } = useTheme();
  const toEmail = () => router.push("/onboarding/email");

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <Text style={[typeScale.balanceHero, { color: colors.ink }]}>Hush</Text>
        <Text style={[styles.tagline, { color: colors.sub }]}>
          Pay friends privately. Amounts stay hidden — always.
        </Text>
      </View>
      <View style={styles.actions}>
        <Button label="Get started" variant="primary" onPress={toEmail} />
        <Button
          label="I already have an account"
          variant="ghost"
          onPress={toEmail}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, justifyContent: "center", gap: spacing.md },
  tagline: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 23, maxWidth: 320 },
  actions: { paddingBottom: spacing.xl, gap: spacing.sm },
});
