import Feather from "@expo/vector-icons/Feather";
import { StyleSheet, Text, View } from "react-native";
import { spacing } from "@/design-system/tokens";
import { useTheme } from "@/design-system/theme";
import { fonts } from "@/design-system/typography";

// A friendly empty state — an icon in a soft circle + a title and optional subtitle —
// used wherever a list has no items, instead of a bare line of muted text.
export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.icon, { backgroundColor: colors.chip }]}>
        <Feather name={icon} size={22} color={colors.sub} />
      </View>
      <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.sub, { color: colors.sub }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  title: { fontFamily: fonts.ui, fontSize: 15, fontWeight: "700", textAlign: "center" },
  sub: {
    fontFamily: fonts.ui,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    maxWidth: 280,
  },
});
