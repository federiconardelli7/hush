import { Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { radius, shadow } from "../tokens";
import { fonts } from "../typography";
import { useTheme } from "../theme";

type Variant = "primary" | "secondary" | "ghost";

export function Button({
  label,
  onPress,
  variant = "primary",
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const bg =
    variant === "primary"
      ? colors.actBlue
      : variant === "secondary"
        ? colors.card
        : "transparent";
  const fg = variant === "primary" ? "#FFFFFF" : colors.ink;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, transform: [{ scale: pressed ? 0.97 : 1 }] },
        variant === "primary" ? shadow.buttonBlue : null,
        variant === "secondary"
          ? { borderWidth: 1, borderColor: colors.line }
          : null,
        style,
      ]}
    >
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontFamily: fonts.ui, fontSize: 15.5, fontWeight: "700" },
});
