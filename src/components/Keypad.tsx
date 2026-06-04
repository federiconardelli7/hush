import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/design-system/theme";
import { fonts } from "@/design-system/typography";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

// Numeric keypad used by Add money / Cash out / Pay (hi-fi 3-column layout).
export function Keypad({ onKey }: { onKey: (key: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.grid}>
      {KEYS.map((k) => (
        <Pressable
          key={k}
          onPress={() => onKey(k)}
          style={({ pressed }) => [styles.key, pressed && styles.pressed]}
        >
          <Text style={[styles.label, { color: colors.ink }]}>{k}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// Applies a keypad press to a typed amount string (max 2 decimals).
export function applyAmountKey(current: string, key: string): string {
  if (key === "⌫") return current.slice(0, -1);
  if (key === ".") {
    if (current.includes(".")) return current;
    return current === "" ? "0." : `${current}.`;
  }
  if (current === "0") return key;
  const [, decimals] = current.split(".");
  if (decimals !== undefined && decimals.length >= 2) return current;
  if (current.replace(".", "").length >= 9) return current;
  return current + key;
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap" },
  key: {
    width: "33.33%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
  },
  pressed: { opacity: 0.4 },
  label: { fontFamily: fonts.display, fontSize: 26, fontWeight: "600" },
});
