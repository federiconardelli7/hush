import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { applyAmountKey, Keypad } from "@/components/Keypad";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";

const PRESETS = ["50", "100", "500", "1000"];
const presetLabel = (v: string) => (v === "1000" ? "$1k" : `$${v}`);

export default function AddMoney() {
  const { colors } = useTheme();
  const { deposit } = useEerc();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = Number(amount || "0");
  const canAdd = value > 0 && !busy;

  const onAdd = async () => {
    if (!canAdd) return;
    setBusy(true);
    setError(null);
    try {
      await deposit(amount);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add money.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: colors.chip }]}
        >
          <Text style={[styles.chev, { color: colors.ink }]}>‹</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.ink }]}>Add money</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.amountWrap}>
        <Text style={[typeScale.balanceHero, styles.amount, { color: colors.ink }]}>
          <Text style={[styles.dollar, { color: colors.sub }]}>$</Text>
          {amount || "0"}
        </Text>
        <Text style={[styles.caption, { color: colors.sub }]}>
          Wrapped into your private balance. Amounts stay encrypted.
        </Text>
      </View>

      <View style={styles.presets}>
        {PRESETS.map((v) => {
          const selected = amount === v;
          return (
            <Pressable
              key={v}
              onPress={() => setAmount(v)}
              style={[
                styles.chip,
                { backgroundColor: selected ? colors.ink : colors.chip },
              ]}
            >
              <Text
                style={[styles.chipText, { color: selected ? colors.bg : colors.sub }]}
              >
                {presetLabel(v)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.method, { backgroundColor: colors.card, borderColor: colors.line }]}>
        <View style={[styles.methodIcon, { backgroundColor: colors.chip }]}>
          <Text style={{ fontSize: 17 }}>🧪</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.methodSub, { color: colors.sub }]}>Funding · test tokens</Text>
          <Text style={[styles.methodMain, { color: colors.ink }]}>Fuji testnet</Text>
        </View>
      </View>

      <View style={styles.keypadWrap}>
        <Keypad onKey={(k) => setAmount((a) => applyAmountKey(a, k))} />
      </View>

      {error ? (
        <Text style={[styles.error, { color: colors.avRed }]}>{error}</Text>
      ) : null}
      <Button
        label={busy ? "Adding…" : value > 0 ? `Add $${amount}` : "Add money"}
        variant="primary"
        onPress={onAdd}
        style={styles.cta}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  chev: { fontSize: 26, fontWeight: "700", lineHeight: 28 },
  title: { flex: 1, textAlign: "center", fontFamily: fonts.ui, fontSize: 18, fontWeight: "700" },
  amountWrap: { alignItems: "center", marginTop: spacing.lg, gap: spacing.sm },
  amount: { fontFamily: fonts.display },
  dollar: { fontSize: 30, fontWeight: "700" },
  caption: { fontFamily: fonts.ui, fontSize: 12.5, textAlign: "center", maxWidth: 280 },
  presets: { flexDirection: "row", gap: spacing.sm, justifyContent: "center", marginTop: spacing.md },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill },
  chipText: { fontFamily: fonts.ui, fontSize: 13, fontWeight: "600" },
  method: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: 12,
    borderRadius: radius.button,
    borderWidth: 1,
    marginTop: spacing.lg,
  },
  methodIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  methodSub: { fontFamily: fonts.ui, fontSize: 12 },
  methodMain: { fontFamily: fonts.ui, fontSize: 14, fontWeight: "600" },
  keypadWrap: { marginTop: "auto", paddingTop: spacing.lg },
  error: { fontFamily: fonts.ui, fontSize: 13, textAlign: "center", marginBottom: spacing.sm },
  cta: { marginTop: spacing.sm, marginBottom: spacing.lg },
});
