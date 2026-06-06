import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DesktopScreen } from "@/components/DesktopScreen";
import { FundUsdcCard } from "@/components/FundUsdcCard";
import { applyAmountKey, Keypad } from "@/components/Keypad";
import { TokenPicker } from "@/components/TokenPicker";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";
import { useIsWide } from "@/design-system/useResponsive";
import { DEFAULT_TOKEN, tokenByAddress } from "@/features/eerc/tokens/registry";
import { useEerc } from "@/features/eerc/useEerc";
import { accountEventsRepo } from "@/features/payments/accountEventsRepo";

const PRESETS = ["50", "100", "500", "1000"];
const presetLabel = (v: string) => (v === "1000" ? "$1k" : `$${v}`);

export default function AddMoney() {
  const { colors } = useTheme();
  const { deposit, address } = useEerc();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<string>(DEFAULT_TOKEN.address);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = Number(amount || "0");
  const canAdd = value > 0 && !busy;
  const info = tokenByAddress(token);

  const onAdd = async () => {
    if (!canAdd) return;
    setBusy(true);
    setError(null);
    try {
      const { transactionHash } = await deposit(amount, token);
      if (address) {
        await accountEventsRepo.record({
          tx_hash: transactionHash,
          address,
          kind: "deposit",
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["activity"] });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add money.");
    } finally {
      setBusy(false);
    }
  };

  // The funding section: the TokenPicker (tap to switch method/token) + the USDC
  // funding detail below it when USDC is selected. TEST funds instantly via the faucet.
  const funding = (
    <View style={styles.funding}>
      <TokenPicker value={token} onChange={setToken} label="Funding" />
      {info?.mintable ? null : (
        <View style={styles.usdcWrap}>
          <FundUsdcCard address={address} />
        </View>
      )}
    </View>
  );

  const presets = (
    <View style={styles.presets}>
      {PRESETS.map((v) => {
        const selected = amount === v;
        return (
          <Pressable
            key={v}
            onPress={() => setAmount(v)}
            style={[styles.chip, { backgroundColor: selected ? colors.ink : colors.chip }]}
          >
            <Text style={[styles.chipText, { color: selected ? colors.bg : colors.sub }]}>
              {presetLabel(v)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const isWide = useIsWide();

  if (isWide) {
    return (
      <DesktopScreen title="Add money" back center maxWidth={460}>
        <View style={[styles.amountWrap, styles.amountWrapWide]}>
          <Text style={[typeScale.balanceHero, styles.amount, { color: colors.ink }]}>
            <Text style={[styles.dollar, { color: colors.sub }]}>$</Text>
            {amount || "0"}
          </Text>
          <Text style={[styles.caption, { color: colors.sub }]}>
            Wrapped into your private balance. Amounts stay encrypted.
          </Text>
        </View>
        {presets}
        {funding}
        <View style={styles.keypadWrapWide}>
          <Keypad onKey={(k) => setAmount((a) => applyAmountKey(a, k))} />
        </View>
        {error ? <Text style={[styles.error, { color: colors.avRed }]}>{error}</Text> : null}
        <Button
          label={busy ? "Adding…" : value > 0 ? `Add $${amount}` : "Add money"}
          variant="primary"
          onPress={onAdd}
          style={styles.ctaWide}
        />
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
      {presets}
      {funding}
      <View style={styles.keypadWrap}>
        <Keypad onKey={(k) => setAmount((a) => applyAmountKey(a, k))} />
      </View>
      {error ? <Text style={[styles.error, { color: colors.avRed }]}>{error}</Text> : null}
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
  amountWrapWide: { marginTop: spacing.xl },
  amount: { fontFamily: fonts.display },
  dollar: { fontSize: 30, fontWeight: "700" },
  caption: { fontFamily: fonts.ui, fontSize: 12.5, textAlign: "center", maxWidth: 280 },
  presets: { flexDirection: "row", gap: spacing.sm, justifyContent: "center", marginTop: spacing.md },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill },
  chipText: { fontFamily: fonts.ui, fontSize: 13, fontWeight: "600" },
  funding: { marginTop: spacing.lg },
  usdcWrap: { marginTop: spacing.sm },
  keypadWrap: { marginTop: "auto", paddingTop: spacing.lg },
  keypadWrapWide: { marginTop: spacing.xl },
  error: { fontFamily: fonts.ui, fontSize: 13, textAlign: "center", marginBottom: spacing.sm },
  cta: { marginTop: spacing.sm, marginBottom: spacing.lg },
  ctaWide: { marginTop: spacing.xl },
});
