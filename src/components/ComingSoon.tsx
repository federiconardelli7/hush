import { StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";

// Placeholder for routes that land in Stage B (send/feed/activity). Keeps the
// tab bar complete and navigable in the Stage A slice.
export function ComingSoon({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <ScreenContainer>
      <View style={styles.center}>
        <Text style={[typeScale.screenTitle, { color: colors.ink }]}>{title}</Text>
        <Text style={[styles.sub, { color: colors.sub }]}>Coming soon</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  sub: { fontFamily: fonts.ui, fontSize: 14 },
});
