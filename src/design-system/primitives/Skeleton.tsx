import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type ViewStyle } from "react-native";
import { radius } from "@/design-system/tokens";
import { useTheme } from "@/design-system/theme";

// A pulsing placeholder block for loading states. `width` accepts any RN dimension
// (number or "%"); `height` defaults to a text-line height. Replaces bare "Loading…".
export function Skeleton({
  width,
  height = 12,
  radius: r = 8,
  style,
}: {
  width?: ViewStyle["width"];
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: r, backgroundColor: colors.chip, opacity: pulse },
        style,
      ]}
    />
  );
}

// A loading row matching the list rows (avatar + two text lines + amount). Render a few
// inside a card while a list loads so the layout doesn't jump when data arrives.
export function SkeletonRow() {
  return (
    <View style={styles.row}>
      <Skeleton width={42} height={42} radius={21} />
      <View style={styles.lines}>
        <Skeleton width="55%" height={13} />
        <Skeleton width="34%" height={11} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width={52} height={14} />
    </View>
  );
}

// N skeleton rows in a card — a drop-in list placeholder while data loads.
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={i ? { borderTopWidth: 1, borderTopColor: colors.line } : undefined}
        >
          <SkeletonRow />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  lines: { flex: 1 },
  card: { borderRadius: radius.card },
});
