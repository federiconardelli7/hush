import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { QrCode } from "@/components/QrCode";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";

// Funding panel for non-mintable tokens (USDC): there's no in-app faucet, so the
// user funds by sending USDC to their own wallet address (QR + monospace copy),
// then taps Add to deposit it. Mirrors the my-code QR pattern. No deposit logic here.
export function FundUsdcCard({ address }: { address: string | null }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }]}>
      <Text style={[styles.heading, { color: colors.ink }]}>Add USDC</Text>

      <View style={[styles.qrCard, { backgroundColor: colors.card }]}>
        {address ? (
          <QrCode value={address} size={160} />
        ) : (
          <Text style={[styles.preparing, { color: colors.sub }]}>Preparing…</Text>
        )}
      </View>

      <Text style={[styles.addr, { color: colors.sub }]} selectable>
        {address ?? "Preparing…"}
      </Text>

      <Pressable
        onPress={() => void Linking.openURL("https://faucet.circle.com")}
        style={styles.link}
      >
        <Text style={[styles.linkText, { color: colors.actBlue }]}>Get test USDC ↗</Text>
      </Pressable>

      <Text style={[styles.note, { color: colors.sub }]}>
        Send USDC to this address, then tap Add to deposit it.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.button,
    borderWidth: 1,
    marginTop: spacing.lg,
  },
  heading: { fontFamily: fonts.ui, fontSize: 16, fontWeight: "700" },
  qrCard: {
    padding: spacing.md,
    borderRadius: radius.card,
    alignItems: "center",
    justifyContent: "center",
  },
  preparing: {
    fontFamily: fonts.ui,
    fontSize: 14,
    width: 160,
    height: 160,
    textAlign: "center",
    textAlignVertical: "center",
  },
  addr: { fontFamily: fonts.mono, fontSize: 11.5, textAlign: "center", maxWidth: "100%" },
  link: { paddingVertical: spacing.xs },
  linkText: { fontFamily: fonts.ui, fontSize: 13, fontWeight: "600" },
  note: { fontFamily: fonts.ui, fontSize: 12, textAlign: "center", maxWidth: 280 },
});
