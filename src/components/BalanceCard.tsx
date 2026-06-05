import Feather from "@expo/vector-icons/Feather";
import { StyleSheet, Text, View } from "react-native";
import { radius, spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";
import { useTheme } from "@/design-system/theme";

// Decrypted balance shown client-side. The lock "Private" chip is always present;
// the amount is never sent to or stored by any server.
export function BalanceCard({ balance }: { balance: string }) {
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
      <Text style={[typeScale.balanceHero, styles.hero, { color: colors.ink }]}>
        {balance}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: { fontFamily: fonts.ui, fontSize: 13.5, fontWeight: "600" },
  hero: { fontFamily: fonts.ui },
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
