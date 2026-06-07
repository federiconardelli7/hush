import Feather from "@expo/vector-icons/Feather";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { type ReactNode } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { isAddress, zeroAddress } from "viem";
import { DesktopScreen } from "@/components/DesktopScreen";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";
import { useIsWide } from "@/design-system/useResponsive";
import { useEerc } from "@/features/eerc/useEerc";
import { tokenByAddress } from "@/features/eerc/tokens/registry";
import { useMoveOut } from "@/features/eerc/useMoveOut";
import { formatMoney } from "@/lib/money";

const short = (a: string) => `${a.slice(0, 10)}…${a.slice(-8)}`;

// Confirm + execute the move-out (send to an external wallet). Reached from Cash out
// when the destination is "another address". The funds leave the encrypted balance in
// two steps (cash out → send); see useMoveOut. The confirmation card is the fat-finger
// guard — it shows the FULL destination address before anything moves.
export default function MoveOutConfirm() {
  const { colors } = useTheme();
  const isWide = useIsWide();
  const queryClient = useQueryClient();
  const { to, amount, token } = useLocalSearchParams<{
    to: string;
    amount: string;
    token: string;
  }>();
  const { address } = useEerc();
  const { phase, error, txHash, run, retry } = useMoveOut();
  const info = tokenByAddress(token ?? "");

  // Re-validate the destination at this executing boundary — this is a registered
  // route, so we never trust that `to` was sanitized by the screen that pushed here.
  // Rejects malformed, zero, and the user's own address before any funds can move.
  const valid =
    isAddress(to ?? "") &&
    (to ?? "").toLowerCase() !== zeroAddress &&
    (to ?? "").toLowerCase() !== address?.toLowerCase();

  const inFlight = phase === "cashing" || phase === "sending";
  const amountLabel = info ? `${formatMoney(amount)} ${info.symbol}` : formatMoney(amount);

  const onConfirm = async () => {
    if (!valid || !amount || !token) return;
    await run(to, amount, token);
    // The withdraw leg is an on-chain Withdraw event → reconcile shows it in Activity.
    await queryClient.invalidateQueries({ queryKey: ["activity"] });
  };

  const onDone = () => router.replace("/home");

  let body: ReactNode;
  if (!valid) {
    body = (
      <View style={styles.centerWrap}>
        <Feather name="alert-triangle" size={48} color={colors.avRed} />
        <Text style={[typeScale.screenTitle, { color: colors.ink }]}>Invalid address</Text>
        <Text style={[styles.sub, { color: colors.sub }]}>
          We can't send to this address. Go back and double-check it.
        </Text>
        <Button label="Go back" variant="primary" onPress={() => router.back()} style={styles.cta} />
      </View>
    );
  } else if (phase === "done") {
    body = (
      <View style={styles.centerWrap}>
        <Feather name="check" size={56} color={colors.positive} />
        <Text style={[typeScale.screenTitle, { color: colors.ink }]}>Sent {amountLabel}</Text>
        <Text style={[styles.sub, { color: colors.sub }]}>to {to ? short(to) : ""}</Text>
        {txHash ? (
          <Pressable onPress={() => Linking.openURL(`https://testnet.snowtrace.io/tx/${txHash}`)}>
            <Text style={[styles.link, { color: colors.actBlue }]}>View on Snowtrace ›</Text>
          </Pressable>
        ) : null}
        <Button label="Done" variant="primary" onPress={onDone} style={styles.cta} />
      </View>
    );
  } else if (inFlight) {
    body = (
      <View style={styles.centerWrap}>
        <ActivityIndicator color={colors.actBlue} size="large" />
        <Text style={[typeScale.screenTitle, { color: colors.ink }]}>
          {phase === "cashing" ? "Cashing out…" : "Sending…"}
        </Text>
        <Text style={[styles.sub, { color: colors.sub }]}>
          {phase === "cashing"
            ? "Moving your funds out of Hush"
            : `Sending ${amountLabel} to ${to ? short(to) : ""}`}
        </Text>
      </View>
    );
  } else if (phase === "transfer-failed") {
    body = (
      <View style={styles.centerWrap}>
        <Feather name="alert-triangle" size={48} color={colors.avRed} />
        <Text style={[typeScale.screenTitle, { color: colors.ink }]}>Transfer didn't go through</Text>
        <Text style={[styles.sub, { color: colors.sub }]}>
          Your {amountLabel} is safe in your wallet — it was cashed out but not sent. You can retry the send.
        </Text>
        {error ? <Text style={[styles.errDetail, { color: colors.sub }]}>{error}</Text> : null}
        <Button
          label="Retry send"
          variant="primary"
          onPress={() => valid && amount && token && retry(to, amount, token)}
          style={styles.cta}
        />
        <Button label="Done" variant="ghost" onPress={onDone} style={styles.ctaGhost} />
      </View>
    );
  } else {
    // idle — the confirmation card (fat-finger guard).
    body = (
      <View style={styles.idleWrap}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }]}>
          <Text style={[styles.cardLabel, { color: colors.sub }]}>Send out of Hush</Text>
          <Text style={[styles.amount, { color: colors.ink }]}>{amountLabel}</Text>
          <Text style={[styles.cardLabel, { color: colors.sub, marginTop: spacing.md }]}>To this wallet</Text>
          <Text style={[styles.addr, { color: colors.ink }]} selectable>
            {to}
          </Text>
          <View style={[styles.warn, { backgroundColor: colors.chip }]}>
            <Feather name="alert-triangle" size={15} color={colors.avRed} />
            <Text style={[styles.warnText, { color: colors.sub }]}>
              Double-check the address. These funds leave Hush to an external wallet and this can't be undone.
            </Text>
          </View>
        </View>
        {error ? <Text style={[styles.error, { color: colors.avRed }]}>{error}</Text> : null}
        <Button label={`Confirm & send ${amountLabel}`} variant="primary" onPress={onConfirm} style={styles.cta} />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={styles.ctaGhost} />
      </View>
    );
  }

  if (isWide) {
    return (
      <DesktopScreen title="Send out" back={!inFlight} center maxWidth={460}>
        {body}
      </DesktopScreen>
    );
  }
  return (
    <ScreenContainer maxWidth={460}>
      <View style={styles.header}>
        {inFlight ? (
          <View style={styles.iconBtn} />
        ) : (
          <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.chip }]}>
            <Text style={[styles.chev, { color: colors.ink }]}>‹</Text>
          </Pressable>
        )}
        <Text style={[styles.title, { color: colors.ink }]}>Send out</Text>
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
  idleWrap: { flex: 1, justifyContent: "center", gap: spacing.lg },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, paddingHorizontal: spacing.md },
  card: { borderRadius: radius.card, borderWidth: 1, padding: spacing.lg, gap: 4 },
  cardLabel: { fontFamily: fonts.ui, fontSize: 12.5, fontWeight: "600" },
  amount: { fontFamily: fonts.display, fontSize: 32, fontWeight: "700" },
  addr: { fontFamily: fonts.mono, fontSize: 13, marginTop: 2 },
  warn: { flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 12, borderRadius: radius.input, marginTop: spacing.md },
  warnText: { flex: 1, fontFamily: fonts.ui, fontSize: 12.5, lineHeight: 17 },
  sub: { fontFamily: fonts.ui, fontSize: 14, textAlign: "center", maxWidth: 320 },
  errDetail: { fontFamily: fonts.ui, fontSize: 12, textAlign: "center" },
  link: { fontFamily: fonts.ui, fontSize: 13, fontWeight: "600" },
  error: { fontFamily: fonts.ui, fontSize: 13, textAlign: "center" },
  cta: { alignSelf: "stretch", marginTop: spacing.sm },
  ctaGhost: { alignSelf: "stretch" },
});
