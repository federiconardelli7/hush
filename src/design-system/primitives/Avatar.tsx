import { StyleSheet, Text, View } from "react-native";
import { fonts } from "../typography";
import { useTheme } from "../theme";

// hex (#rrggbb) -> rgba() at alpha (ported from hifi-shared.jsx).
function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Tinted circle with initials. Dark mode keeps each person's colour identity.
export function Avatar({
  name,
  tint = "#E7E3DA",
  ink = "#6B6557",
  size = 44,
}: {
  name: string;
  tint?: string;
  ink?: string;
  size?: number;
}) {
  const { isDark } = useTheme();
  const bg = isDark ? hexA(ink, 0.3) : tint;
  const fg = isDark ? tint : ink;
  return (
    <View
      style={[
        styles.av,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Text
        style={{
          color: fg,
          fontFamily: fonts.ui,
          fontWeight: "700",
          fontSize: size * 0.36,
        }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  av: { alignItems: "center", justifyContent: "center" },
});
