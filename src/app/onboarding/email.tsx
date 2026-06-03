import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";
import { useEmailOtp } from "@/features/auth/useEmailOtp";

const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// Email capture → Privy sends a 6-digit OTP, then we move to the verify screen.
export default function Email() {
  const { colors } = useTheme();
  const { status, error, requestCode } = useEmailOtp();
  const [email, setEmail] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const sending = status === "sending-code";

  const onContinue = async () => {
    if (sending) return;
    const value = email.trim();
    if (!looksLikeEmail(value)) {
      setLocalError("Enter a valid email address.");
      return;
    }
    setLocalError(null);
    try {
      await requestCode(value);
      router.push("/onboarding/verify");
    } catch {
      // surfaced inline via `error`
    }
  };

  const shownError = localError ?? error;

  return (
    <ScreenContainer>
      <View style={styles.body}>
        <Text style={[typeScale.screenTitle, { color: colors.ink }]}>
          What&apos;s your email?
        </Text>
        <Text style={[styles.sub, { color: colors.sub }]}>
          We&apos;ll send you a 6-digit code. Your account &amp; secure keys are
          created automatically — nothing to write down.
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.sub}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
          onSubmitEditing={onContinue}
          style={[
            styles.input,
            { backgroundColor: colors.card, color: colors.ink, borderColor: colors.line },
          ]}
        />
        {shownError ? (
          <Text style={[styles.error, { color: colors.avRed }]}>{shownError}</Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Button
          label={sending ? "Sending…" : "Continue"}
          variant="primary"
          onPress={onContinue}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: "center", gap: spacing.md },
  sub: { fontFamily: fonts.ui, fontSize: 14.5, lineHeight: 21, maxWidth: 340 },
  input: {
    fontFamily: fonts.ui,
    fontSize: 17,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: radius.input,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  error: { fontFamily: fonts.ui, fontSize: 13 },
  actions: { paddingBottom: spacing.xl },
});
