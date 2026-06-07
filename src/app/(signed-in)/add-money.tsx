import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
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
import { useWalletTokenBalance } from "@/features/eerc/useWalletBalance";
import { accountEventsRepo } from "@/features/payments/accountEventsRepo";
import { formatTokenAmount } from "@/lib/money";
import { friendlyTxError } from "@/lib/txError";

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
  const [showFund, setShowFund] = useState(false);

  const info = tokenByAddress(token);
  const wallet = useWalletTokenBalance(token);
  const value = Number(amount || "0");
  const canAdd = value > 0 && !busy;

  // Reset the error on any token/amount change; collapse funding when the token changes.
  useEffect(() => setError(null), [token, amount]);
  useEffect(() => setShowFund(false), [token]);

  const onAdd = async () => {
    if (!canAdd) return;
    setBusy(true);
    setError(null);
    try {
      // The on-chain deposit is the success boundary: once it resolves the money has
      // moved, so failing to record the activity row must NOT look like a failed add.
      const { transactionHash } = await deposit(amount, token);
      if (address) {
        try {
          await accountEventsRepo.record({ tx_hash: transactionHash, address, kind: "deposit" });
        } catch {
          // Best-effort — the on-chain reconcile backfills this row on the next
          // Activity load (reconcileAccountEvents), so don't surface an error.
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["activity"] });
      router.back();
    } catch (err) {
      setError(
        friendlyTxError(err, {
          insufficient: `Not enough ${info?.symbol ?? "funds"} in your wallet${
            info && wallet.parsed ? ` — ${formatTokenAmount(wallet.parsed, info)} available` : ""
          }.`,
          fallback: "Couldn't add money. Please try again.",
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  // TEST auto-mints from the faucet; USDC shows the wallet balance + a collapsible
  // "Need USDC?" with the address/QR (auto-open when the wallet balance is $0).
  const usdcZero = !info?.mintable && Number(wallet.parsed || "0") === 0;
  const fundOpen = !info?.mintable && (showFund || usdcZero);
  const caption = info?.mintable
    ? "Funded instantly · testnet faucet"
    : info
      ? `${formatTokenAmount(wallet.parsed || "0", info)} in your wallet`
      : "";

  const body = (
    <>
      <TokenPicker value={token} onChange={setToken} label="Funding" />

      <View style={styles.amountWrap}>
        <Text style={[typeScale.balanceHero, styles.amount, { color: colors.ink }]}>
          <Text style={[styles.dollar, { color: colors.sub }]}>$</Text>
          {amount || "0"}
        </Text>
        <Text style={[styles.caption, { color: colors.sub }]}>{caption}</Text>
      </View>

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

      {!info?.mintable ? (
        <View style={styles.funding}>
          {usdcZero ? null : (
            <Pressable onPress={() => setShowFund((o) => !o)} hitSlop={8}>
              <Text style={[styles.needText, { color: colors.actBlue }]}>
                {showFund ? "Hide funding details" : "Need USDC? Get it"} ›
              </Text>
            </Pressable>
          )}
          {fundOpen ? (
            <View style={styles.usdcWrap}>
              <FundUsdcCard address={address} />
            </View>
          ) : null}
        </View>
      ) : null}

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
    </>
  );

  const isWide = useIsWide();
  if (isWide) {
    return (
      <DesktopScreen title="Add money" back center maxWidth={460}>
        {body}
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
      {body}
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
  funding: { marginTop: spacing.md, alignItems: "center", gap: spacing.sm },
  needText: { fontFamily: fonts.ui, fontSize: 13, fontWeight: "600" },
  usdcWrap: { alignSelf: "stretch" },
  keypadWrap: { marginTop: spacing.lg },
  error: { fontFamily: fonts.ui, fontSize: 13, textAlign: "center", marginTop: spacing.sm },
  cta: { marginTop: spacing.md, marginBottom: spacing.lg },
});
