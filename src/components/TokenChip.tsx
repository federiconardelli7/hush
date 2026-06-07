import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { TOKENS, tokenByAddress } from "@/features/eerc/tokens/registry";

const MENU_W = 200;

// The coin chip shown directly UNDER the amount — the coin is the denomination of
// what you're typing (Add money / Send / Cash out). Tapping it opens a small menu
// that FLOATS over the content below (absolute + zIndex) so the amount never reflows.
// The host screen's amount block needs a raised zIndex so this menu paints on top.
export function TokenChip({
  value,
  onChange,
}: {
  value: string;
  onChange: (address: string) => void;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = tokenByAddress(value) ?? TOKENS[0];

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[styles.chip, { backgroundColor: colors.chip }]}
      >
        <Text style={[styles.sym, { color: colors.ink }]}>{selected.symbol}</Text>
        <Feather name={open ? "chevron-up" : "chevron-down"} size={15} color={colors.sub} />
      </Pressable>

      {open ? (
        <View
          style={[
            styles.menu,
            {
              backgroundColor: colors.card,
              borderColor: colors.line,
              shadowColor: "#000",
            },
          ]}
        >
          {TOKENS.map((t, i) => {
            const on = t.address.toLowerCase() === value.toLowerCase();
            return (
              <Pressable
                key={t.address}
                onPress={() => {
                  onChange(t.address);
                  setOpen(false);
                }}
                style={[
                  styles.row,
                  i ? { borderTopWidth: 1, borderTopColor: colors.line } : null,
                ]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.rowSym, { color: colors.ink }]}>{t.symbol}</Text>
                  <Text style={[styles.rowLabel, { color: colors.sub }]}>{t.label}</Text>
                </View>
                {on ? <Feather name="check" size={16} color={colors.actBlue} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // alignSelf keeps the chip centered under the amount; zIndex lets the open menu
  // float over the Available/presets rows below it.
  wrap: { alignSelf: "center", marginTop: spacing.xs, zIndex: 30 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  sym: { fontFamily: fonts.ui, fontSize: 15, fontWeight: "700" },
  menu: {
    position: "absolute",
    top: 42,
    left: "50%",
    marginLeft: -MENU_W / 2,
    width: MENU_W,
    borderRadius: radius.button,
    borderWidth: 1,
    overflow: "hidden",
    zIndex: 30,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  rowSym: { fontFamily: fonts.ui, fontSize: 14.5, fontWeight: "700" },
  rowLabel: { fontFamily: fonts.ui, fontSize: 12, marginTop: 1 },
});
