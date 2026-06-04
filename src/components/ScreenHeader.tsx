import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/design-system/theme";
import { spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";

// Back-chevron + centered title header for pushed (non-tab) screens.
export function ScreenHeader({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        style={[styles.iconBtn, { backgroundColor: colors.chip }]}
      >
        <Text style={[styles.chev, { color: colors.ink }]}>‹</Text>
      </Pressable>
      <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.iconBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  chev: { fontSize: 26, fontWeight: "700", lineHeight: 28 },
  title: { flex: 1, textAlign: "center", fontFamily: fonts.ui, fontSize: 18, fontWeight: "700" },
});
