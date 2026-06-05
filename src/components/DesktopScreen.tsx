import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { WebTopBar } from "@/components/WebTopBar";
import { useTheme } from "@/design-system/theme";
import { layout } from "@/design-system/tokens";

// Desktop scene shell: a fixed top bar + a scrolling, centered content column. Screens
// render this on wide viewports (see useIsWide); mobile keeps ScreenContainer.
export function DesktopScreen({
  title,
  head,
  back,
  center,
  maxWidth = layout.content,
  children,
}: {
  title: string;
  head?: ReactNode;
  back?: boolean;
  center?: boolean;
  maxWidth?: number;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <WebTopBar title={title} head={head} back={back} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, center ? styles.contentCenter : null]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.col, { maxWidth }]}>{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { alignItems: "center", paddingHorizontal: 30, paddingTop: 28, paddingBottom: 40 },
  contentCenter: { flexGrow: 1, justifyContent: "center" },
  col: { width: "100%" },
});
