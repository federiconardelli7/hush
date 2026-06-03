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
  const { address } = useEerc();

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
  addrBox: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.input,
    borderWidth: 1,
  },
  addr: { fontFamily: fonts.mono, fontSize: 13 },
  actions: { gap: spacing.sm, marginTop: spacing.xl },
});
