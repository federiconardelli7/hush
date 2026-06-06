import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { TOKENS, tokenByAddress } from "@/features/eerc/tokens/registry";

// The one token picker used by Add money / Send / Cash out so selection works
// identically everywhere. A method-card header (à la the old funding card) that
// taps open an options panel below it — the same inline-disclosure pattern as the
// Activity date pill (no modal/sheet infra). `label` is the per-screen framing
// ("Funding" / "Pay with" / "Cash out"); the interaction is the same.
export function TokenPicker({
  value,
  onChange,
  label = "Token",
}: {
  value: string;
  onChange: (address: string) => void;
  label?: string;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = tokenByAddress(value) ?? TOKENS[0];

  return (
    <View>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }]}
      >
        <View style={[styles.icon, { backgroundColor: colors.chip }]}>
          <Feather name="dollar-sign" size={18} color={colors.ink} />
        </View>
        <View style={styles.headText}>
          <Text style={[styles.label, { color: colors.sub }]}>{label}</Text>
          <Text style={[styles.main, { color: colors.ink }]} numberOfLines={1}>
            {selected.symbol} · {selected.label}
          </Text>
        </View>
        <Feather
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.sub}
        />
      </Pressable>

      {open ? (
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.line }]}>
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
                <View style={styles.headText}>
                  <Text style={[styles.rowSym, { color: colors.ink }]}>{t.symbol}</Text>
                  <Text style={[styles.rowLabel, { color: colors.sub }]}>{t.label}</Text>
                </View>
                {on ? <Feather name="check" size={18} color={colors.actBlue} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: 12,
    borderRadius: radius.button,
    borderWidth: 1,
  },
  icon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  headText: { flex: 1, minWidth: 0 },
  label: { fontFamily: fonts.ui, fontSize: 12 },
  main: { fontFamily: fonts.ui, fontSize: 14, fontWeight: "600" },
  panel: {
    marginTop: spacing.sm,
    borderRadius: radius.button,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  rowSym: { fontFamily: fonts.ui, fontSize: 14.5, fontWeight: "700" },
  rowLabel: { fontFamily: fonts.ui, fontSize: 12, marginTop: 1 },
});
