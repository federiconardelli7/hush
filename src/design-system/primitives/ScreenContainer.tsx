import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { layout, spacing } from "../tokens";
import { useTheme } from "../theme";

// Full-bleed background with a centered content column. On wide viewports the column is
// capped at `maxWidth` and centered; on narrow screens `width:100% < maxWidth`, so the
// mobile layout is unchanged.
export function ScreenContainer({
  children,
  maxWidth = layout.content,
}: {
  children: ReactNode;
  maxWidth?: number;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.outer, { backgroundColor: colors.bg, paddingTop: insets.top + spacing.lg }]}>
      <View style={[styles.inner, { maxWidth }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, alignItems: "center" },
  inner: { flex: 1, width: "100%", paddingHorizontal: spacing.screen },
});
