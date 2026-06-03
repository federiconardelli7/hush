import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";
import { useEmailOtp } from "@/features/auth/useEmailOtp";

// 6-digit OTP entry. The login flow state lives in the Privy provider, so
// verifying here (a different screen than where the code was requested) works.
// On success `authenticated` flips true and the onboarding layout redirects
// into the app — no navigation needed here.
export default function Verify() {
  const { colors } = useTheme();
  const { status, error, submitCode } = useEmailOtp();
  const [code, setCode] = useState("");
  const verifying = status === "verifying";

  const onVerify = async () => {
    if (verifying || code.trim().length < 6) return;
    try {
      await submitCode(code.trim());
    } catch {
      // surfaced inline via `error`
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.body}>
        <Text style={[typeScale.screenTitle, { color: colors.ink }]}>
          Enter your code
        </Text>
        <Text style={[styles.sub, { color: colors.sub }]}>
          We emailed you a 6-digit code. Keys are created automatically — there&apos;s
          nothing to write down.
        </Text>
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
          placeholder="••••••"
          placeholderTextColor={colors.sub}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={6}
          onSubmitEditing={onVerify}
          style={[
            styles.input,
            { backgroundColor: colors.card, color: colors.ink, borderColor: colors.line },
          ]}
        />
        {error ? (
          <Text style={[styles.error, { color: colors.avRed }]}>{error}</Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Button
          label={verifying ? "Verifying…" : "Verify"}
          variant="primary"
          onPress={onVerify}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: "center", gap: spacing.md },
  sub: { fontFamily: fonts.ui, fontSize: 14.5, lineHeight: 21, maxWidth: 340 },
  input: {
    fontFamily: fonts.mono,
    fontSize: 28,
    letterSpacing: 10,
    textAlign: "center",
    paddingVertical: 15,
    borderRadius: radius.input,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  error: { fontFamily: fonts.ui, fontSize: 13 },
  actions: { paddingBottom: spacing.xl },
});
