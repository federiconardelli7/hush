import { useQueryClient } from "@tanstack/react-query";
import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DesktopScreen } from "@/components/DesktopScreen";
import { applyAmountKey, Keypad } from "@/components/Keypad";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";
import { useIsWide } from "@/design-system/useResponsive";
import { useEerc } from "@/features/eerc/useEerc";
import { accountEventsRepo } from "@/features/payments/accountEventsRepo";
import { formatMoney } from "@/lib/money";

export default function CashOut() {
  const { colors } = useTheme();
  const { withdraw, parsedBalance, balanceReady, address } = useEerc();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = Number(parsedBalance || "0");
  const value = Number(amount || "0");
  const overBalance = value > available;
  const canCashOut = value > 0 && !overBalance && balanceReady && !busy;
  const presets = ["50", "100", "500"].filter((v) => Number(v) <= available);

  const onCashOut = async () => {
    if (!canCashOut) return;
    setBusy(true);
    setError(null);
    try {
      const { transactionHash } = await withdraw(amount);
      if (address) {
        await accountEventsRepo.record({
          tx_hash: transactionHash,
          address,
          kind: "withdraw",
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["activity"] });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't cash out.");
    } finally {
      setBusy(false);
    }
  };

  const label = busy
    ? "Cashing out…"
    : !balanceReady
      ? "Loading your balance…"
      : overBalance
        ? "Not enough balance"
        : value > 0
          ? `Cash out $${amount}`
          : "Enter an amount";

  const isWide = useIsWide();

  if (isWide) {
    const desktopBody = (
      <>
        <View style={[styles.amountWrap, styles.amountWrapWide]}>
          <Text
            style={[
              typeScale.balanceHero,
              styles.amount,
              { color: overBalance ? colors.avRed : colors.ink },
            ]}
          >
            <Text style={[styles.dollar, { color: colors.sub }]}>$</Text>
            {amount || "0"}
          </Text>
          <Text style={[styles.caption, { color: colors.sub }]}>
            Available {formatMoney(parsedBalance)}
          </Text>
        </View>

        <View style={styles.presets}>
          {balanceReady && available > 0 ? (
            <Pressable
              onPress={() => setAmount(parsedBalance)}
              style={[styles.chip, { backgroundColor: colors.chip }]}
            >
              <Text style={[styles.chipText, { color: colors.sub }]}>Max</Text>
            </Pressable>
          ) : null}
          {presets.map((v) => {
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
                  ${v}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.method, { backgroundColor: colors.card, borderColor: colors.line }]}>
          <View style={[styles.methodIcon, { backgroundColor: colors.chip }]}>
            <Feather name="upload" size={20} color={colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.methodSub, { color: colors.sub }]}>Withdraw · test tokens</Text>
            <Text style={[styles.methodMain, { color: colors.ink }]}>To your wallet · Fuji testnet</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.sub} />
        </View>

        <View style={styles.keypadWrapWide}>
          <Keypad onKey={(k) => setAmount((a) => applyAmountKey(a, k))} />
        </View>

        {error ? (
          <Text style={[styles.error, { color: colors.avRed }]}>{error}</Text>
        ) : null}
        <Button
          label={label}
          variant="primary"
          onPress={onCashOut}
          style={styles.ctaWide}
        />
      </>
    );
    return (
      <DesktopScreen title="Cash out" back center maxWidth={460}>
        {desktopBody}
      </DesktopScreen>
    );
  }

  return (
    <ScreenContainer maxWidth={520}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: colors.chip }]}
        >
          <Text style={[styles.chev, { color: colors.ink }]}>‹</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.ink }]}>Cash out</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.amountWrap}>
        <Text
          style={[
            typeScale.balanceHero,
            styles.amount,
            { color: overBalance ? colors.avRed : colors.ink },
          ]}
        >
          <Text style={[styles.dollar, { color: colors.sub }]}>$</Text>
          {amount || "0"}
        </Text>
        <Text style={[styles.caption, { color: colors.sub }]}>
          Available {formatMoney(parsedBalance)}
        </Text>
      </View>

      <View style={styles.presets}>
        {balanceReady && available > 0 ? (
          <Pressable
            onPress={() => setAmount(parsedBalance)}
            style={[styles.chip, { backgroundColor: colors.chip }]}
          >
            <Text style={[styles.chipText, { color: colors.sub }]}>Max</Text>
          </Pressable>
        ) : null}
        {presets.map((v) => {
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
                ${v}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.method, { backgroundColor: colors.card, borderColor: colors.line }]}>
        <View style={[styles.methodIcon, { backgroundColor: colors.chip }]}>
          <Feather name="upload" size={20} color={colors.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.methodSub, { color: colors.sub }]}>Withdraw · test tokens</Text>
          <Text style={[styles.methodMain, { color: colors.ink }]}>To your wallet · Fuji testnet</Text>
        </View>
        <Feather name="chevron-right" size={20} color={colors.sub} />
      </View>

      <View style={styles.keypadWrap}>
        <Keypad onKey={(k) => setAmount((a) => applyAmountKey(a, k))} />
      </View>

      {error ? (
        <Text style={[styles.error, { color: colors.avRed }]}>{error}</Text>
      ) : null}
      <Button
        label={label}
        variant="primary"
        onPress={onCashOut}
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
  amountWrapWide: { marginTop: spacing.xl },
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
  keypadWrapWide: { marginTop: spacing.xl },
  error: { fontFamily: fonts.ui, fontSize: 13, textAlign: "center", marginBottom: spacing.sm },
  cta: { marginTop: spacing.sm, marginBottom: spacing.lg },
  ctaWide: { marginTop: spacing.xl },
});
