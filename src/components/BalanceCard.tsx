import Feather from "@expo/vector-icons/Feather";
import { StyleSheet, Text, View } from "react-native";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { useTheme } from "@/design-system/theme";

// Decrypted per-token balances shown client-side. The lock "Private" chip is always
// present; amounts are never sent to or stored by any server. One row per token —
// both TEST and USDC render as "$", so the symbol distinguishes them.
export function BalanceCard({
  rows,
}: {
  rows: { symbol: string; text: string }[];
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.sub }]}>Total balance</Text>
        <View style={[styles.chip, { backgroundColor: colors.chip }]}>
          <Feather name="lock" size={11} color={colors.sub} />
          <Text style={[styles.chipText, { color: colors.sub }]}>Private</Text>
        </View>
      </View>
      <View style={styles.tokens}>
        {rows.map((r) => (
          <View key={r.symbol} style={styles.tokenRow}>
            <Text style={[styles.amount, { color: colors.ink }]}>{r.text}</Text>
            <Text style={[styles.symbol, { color: colors.sub }]}>{r.symbol}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: { fontFamily: fonts.ui, fontSize: 13.5, fontWeight: "600" },
  tokens: { alignItems: "center", gap: spacing.xs },
  tokenRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  amount: { fontFamily: fonts.ui, fontSize: 32, fontWeight: "800" },
  symbol: { fontFamily: fonts.ui, fontSize: 14, fontWeight: "700" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  chipText: { fontFamily: fonts.ui, fontSize: 11.5, fontWeight: "600" },
});
