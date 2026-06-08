import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { radius, spacing } from "@/design-system/tokens";
import { useTheme } from "@/design-system/theme";
import { fonts } from "@/design-system/typography";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const pad = (n: number) => String(n).padStart(2, "0");
// YYYY-MM-DD (the value format the filter parses); `m` is 0-indexed here.
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
// Always display US format MM/DD/YYYY (the app's date convention), regardless of the
// browser locale — the whole reason this exists instead of <input type="date">.
const usFormat = (iso: string): string => {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
};

// A self-contained calendar date field: tap to open a month grid; shows + returns US
// dates (MM/DD/YYYY). Pure RN, so it renders identically on web and native and isn't at
// the mercy of the browser's date-input locale.
export function CalendarField({
  value,
  onChange,
  align = "left",
}: {
  value: string;
  onChange: (v: string) => void;
  align?: "left" | "right";
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const base = value ? new Date(`${value}T00:00:00`) : new Date();
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });

  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const shift = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <View style={[styles.wrap, { zIndex: open ? 30 : 1 }]}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[
          styles.field,
          { backgroundColor: colors.card, borderColor: open ? colors.actBlue : colors.line },
        ]}
      >
        <Text style={[styles.fieldText, { color: value ? colors.ink : colors.sub }]}>
          {value ? usFormat(value) : "MM/DD/YYYY"}
        </Text>
        <Feather name="calendar" size={15} color={colors.sub} />
      </Pressable>

      {open ? (
        <View
          style={[
            styles.cal,
            align === "right" ? { right: 0 } : { left: 0 },
            { backgroundColor: colors.card, borderColor: colors.line },
          ]}
        >
          <View style={styles.head}>
            <Pressable onPress={() => shift(-1)} hitSlop={10} style={styles.navBtn}>
              <Feather name="chevron-left" size={18} color={colors.ink} />
            </Pressable>
            <Text style={[styles.month, { color: colors.ink }]}>{monthLabel}</Text>
            <Pressable onPress={() => shift(1)} hitSlop={10} style={styles.navBtn}>
              <Feather name="chevron-right" size={18} color={colors.ink} />
            </Pressable>
          </View>
          <View style={styles.gridRow}>
            {WEEKDAYS.map((w) => (
              <Text key={w} style={[styles.weekday, { color: colors.sub }]}>
                {w}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((d, i) => {
              if (d == null) return <View key={`b${i}`} style={styles.cell} />;
              const iso = toIso(view.y, view.m, d);
              const on = iso === value;
              return (
                <Pressable
                  key={iso}
                  onPress={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  style={styles.cell}
                >
                  <View style={[styles.dayDot, on ? { backgroundColor: colors.actBlue } : null]}>
                    <Text style={[styles.dayText, { color: on ? "#fff" : colors.ink }]}>{d}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const CAL_W = 280;
const styles = StyleSheet.create({
  wrap: { position: "relative" },
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.input,
    borderWidth: 1,
  },
  fieldText: { fontFamily: fonts.ui, fontSize: 13 },
  cal: {
    position: "absolute",
    top: 46,
    width: CAL_W,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.md,
    zIndex: 30,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  navBtn: { padding: 4 },
  month: { fontFamily: fonts.ui, fontSize: 14, fontWeight: "700" },
  gridRow: { flexDirection: "row" },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontFamily: fonts.ui,
    fontSize: 11,
    fontWeight: "600",
    paddingVertical: 4,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, alignItems: "center", justifyContent: "center", paddingVertical: 3 },
  dayDot: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  dayText: { fontFamily: fonts.ui, fontSize: 13 },
});
