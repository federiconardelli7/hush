import { usePrivy } from "@privy-io/react-auth";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";

export default function Me() {
  const { colors, isDark, toggle } = useTheme();
  const { logout } = usePrivy();
  const { address, supabaseStatus, supabaseBoundWallet, supabaseError } = useEerc();

  const bound =
    supabaseStatus === "ready" &&
    supabaseBoundWallet === address?.toLowerCase();
  const supabaseLine =
    supabaseStatus === "signing"
      ? "Binding…"
      : supabaseStatus === "error"
        ? (supabaseError ?? "Binding failed")
        : supabaseStatus === "ready"
          ? bound
            ? `Bound ✓ — RLS sees ${supabaseBoundWallet?.slice(0, 10)}…`
            : `Bound, but RLS sees ${supabaseBoundWallet ?? "nothing"}`
          : "—";

  return (
    <ScreenContainer>
      <Text style={[typeScale.screenTitle, styles.title, { color: colors.ink }]}>
        Me
      </Text>

      <Text style={[styles.label, { color: colors.sub }]}>Your address</Text>
      <View
        style={[
          styles.addrBox,
          { backgroundColor: colors.card, borderColor: colors.line },
        ]}
      >
        <Text style={[styles.addr, { color: colors.ink }]} selectable>
          {address ?? "Preparing…"}
        </Text>
      </View>

      <Text style={[styles.label, styles.spacer, { color: colors.sub }]}>
        Database (Supabase)
      </Text>
      <Text
        style={[
          styles.addr,
          {
            color:
              supabaseStatus === "error"
                ? colors.avRed
                : bound
                  ? colors.positive
                  : colors.sub,
          },
        ]}
      >
        {supabaseLine}
      </Text>

      <View style={styles.actions}>
        <Button
          label={isDark ? "Switch to light" : "Switch to dark"}
          variant="secondary"
          onPress={toggle}
        />
        <Button
          label="Sign out"
          variant="ghost"
          onPress={() => {
            void logout();
          }}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.xl },
  label: { fontFamily: fonts.ui, fontSize: 12.5, fontWeight: "600", marginBottom: spacing.xs },
  spacer: { marginTop: spacing.lg },
  addrBox: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.input,
    borderWidth: 1,
  },
  addr: { fontFamily: fonts.mono, fontSize: 13 },
  actions: { gap: spacing.sm, marginTop: spacing.xl },
});
