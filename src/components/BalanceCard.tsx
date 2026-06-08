import Feather from "@expo/vector-icons/Feather";
import { StyleSheet, Text, View } from "react-native";
import { onDarkCard, radius, shadow, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";

// Decrypted per-token balances shown client-side, in a dark "account card" (matching the
// desktop Home card) so the balance reads as the screen's hero with strong visibility. The
// lock "Private" chip is always present; amounts are never sent to or stored by any server.
// One row per token — both TEST and USDC render as "$", so the symbol distinguishes them.
export function BalanceCard({
  rows,
}: {
  rows: { symbol: string; text: string }[];
}) {
  return (
    <View style={[styles.card, shadow.card]}>
      <View style={styles.row}>
        <Text style={styles.label}>Total balance</Text>
        <View style={styles.chip}>
          <Feather name="lock" size={11} color="#fff" />
          <Text style={styles.chipText}>Private</Text>
        </View>
      </View>
      <View style={styles.tokens}>
        {rows.map((r) => (
          <View key={r.symbol} style={styles.tokenRow}>
            <Text style={styles.amount}>{r.text}</Text>
            <Text style={styles.symbol}>{r.symbol}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#16161B",
    borderRadius: radius.cardLg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    gap: spacing.md,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: { fontFamily: fonts.ui, fontSize: 13.5, fontWeight: "600", color: onDarkCard.label },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: onDarkCard.pill,
  },
  chipText: { fontFamily: fonts.ui, fontSize: 11.5, fontWeight: "600", color: "#fff" },
  tokens: { alignItems: "center", gap: spacing.xs },
  tokenRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  amount: { fontFamily: fonts.display, fontSize: 40, fontWeight: "800", color: "#fff" },
  symbol: { fontFamily: fonts.ui, fontSize: 14, fontWeight: "700", color: onDarkCard.label },
});
