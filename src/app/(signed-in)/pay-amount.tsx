import { useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { applyAmountKey, Keypad } from "@/components/Keypad";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { AUDIENCES, paymentsRepo, type Audience } from "@/features/payments/paymentsRepo";
import { requestsRepo } from "@/features/requests/requestsRepo";

const AUDIENCE_LABEL: Record<Audience, string> = {
  friends: "Friends",
  public: "Public",
  private: "Private",
};

export default function PayAmount() {
  const { colors } = useTheme();
  const { to, name, requestId, amount: amountParam } = useLocalSearchParams<{
    to: string;
    name?: string;
    requestId?: string;
    amount?: string;
  }>();
  const prefill = typeof amountParam === "string" ? amountParam : "";
  const { address, send, isAddressRegistered, parsedBalance, balanceReady } =
    useEerc();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(prefill);
  const [memo, setMemo] = useState("");
  const [audience, setAudience] = useState<Audience>("friends");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneTx, setDoneTx] = useState<string | null>(null);

  // Start fresh each time the screen is opened (it's a single reused route, so
  // a prior success/amount would otherwise linger on the next payment).
  useFocusEffect(
    useCallback(() => {
      setDoneTx(null);
      setAmount(prefill);
      setMemo("");
      setError(null);
      setBusy(false);
    }, [prefill]),
  );

  const value = Number(amount || "0");
  const recipient = (to ?? "") as `0x${string}`;

  const onPay = async () => {
    if (busy || value <= 0 || !recipient || !balanceReady) return;
    setBusy(true);
    setError(null);
    try {
      if (!(await isAddressRegistered(recipient))) {
        throw new Error(`${name ?? "Recipient"} hasn't joined Hush yet.`);
      }
      const { transactionHash } = await send(recipient, amount, memo.trim() || undefined);
      if (address) {
        await paymentsRepo.record({
          tx_hash: transactionHash,
          sender_address: address,
          receiver_address: recipient,
          audience,
          caption: memo.trim() || null,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["activity"] });
      if (requestId) {
        await requestsRepo.setStatus(requestId, "fulfilled", transactionHash);
        await queryClient.invalidateQueries({ queryKey: ["requests"] });
      }
      setDoneTx(transactionHash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the payment.");
    } finally {
      setBusy(false);
    }
  };

  if (doneTx) {
    return (
      <ScreenContainer>
        <View style={styles.successWrap}>
          <Text style={[styles.check, { color: colors.positive }]}>✓</Text>
          <Text style={[typeScale.screenTitle, { color: colors.ink }]}>
            Sent to {name ?? "them"}
          </Text>
          <Text style={[styles.successSub, { color: colors.sub }]}>
            🔒 Only you two can see the amount.
          </Text>
          <Text style={[styles.tx, { color: colors.sub }]} selectable>
            {doneTx.slice(0, 20)}…
          </Text>
        </View>
        <Button label="Done" variant="primary" onPress={() => router.replace("/feed")} style={styles.cta} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: colors.chip }]}
        >
          <Text style={[styles.chev, { color: colors.ink }]}>‹</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
          Pay {name ?? ""}
        </Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.amountWrap}>
        <Text style={[typeScale.amount, styles.amount, { color: colors.ink }]}>
          <Text style={[styles.dollar, { color: colors.sub }]}>$</Text>
          {amount || "0"}
        </Text>
        <Text style={[styles.avail, { color: colors.sub }]}>
          Available ${parsedBalance || "0"}
        </Text>
      </View>

      <View style={styles.audience}>
        {AUDIENCES.map((a) => {
          const on = audience === a;
          return (
            <Pressable
              key={a}
              onPress={() => setAudience(a)}
              style={[
                styles.aChip,
                {
                  backgroundColor: on ? "rgba(37,99,235,0.12)" : colors.chip,
                  borderColor: on ? colors.actBlue : "transparent",
                },
              ]}
            >
              <Text style={[styles.aText, { color: on ? colors.actBlue : colors.sub }]}>
                {a === "private" ? "🔒 " : ""}
                {AUDIENCE_LABEL[a]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={memo}
        onChangeText={setMemo}
        placeholder="What's it for?"
        placeholderTextColor={colors.sub}
        maxLength={100}
        style={[
          styles.memo,
          { backgroundColor: colors.card, color: colors.ink, borderColor: colors.line },
        ]}
      />

      <View style={styles.keypadWrap}>
        <Keypad onKey={(k) => setAmount((x) => applyAmountKey(x, k))} />
      </View>

      {error ? <Text style={[styles.error, { color: colors.avRed }]}>{error}</Text> : null}
      <Button
        label={
          busy
            ? "Sending…"
            : !balanceReady
              ? "Loading your balance…"
              : value > 0
                ? `Pay $${amount}`
                : "Enter an amount"
        }
        variant="primary"
        onPress={onPay}
        style={styles.cta}
      />
      <Text style={[styles.footnote, { color: colors.sub }]}>
        🛡 Encrypted · amount stays private
      </Text>
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
  dollar: { fontSize: 34, fontWeight: "700" },
  avail: { fontFamily: fonts.ui, fontSize: 13 },
  audience: { flexDirection: "row", gap: spacing.sm, justifyContent: "center", marginTop: spacing.lg },
  aChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1 },
  aText: { fontFamily: fonts.ui, fontSize: 12.5, fontWeight: "600" },
  memo: {
    fontFamily: fonts.ui,
    fontSize: 15,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: radius.input,
    borderWidth: 1,
    marginTop: spacing.lg,
  },
  keypadWrap: { marginTop: "auto", paddingTop: spacing.md },
  error: { fontFamily: fonts.ui, fontSize: 13, textAlign: "center", marginBottom: spacing.sm },
  cta: { marginTop: spacing.sm },
  footnote: { fontFamily: fonts.ui, fontSize: 12, textAlign: "center", paddingVertical: spacing.md },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  check: { fontSize: 56, fontWeight: "800" },
  successSub: { fontFamily: fonts.ui, fontSize: 14, textAlign: "center" },
  tx: { fontFamily: fonts.mono, fontSize: 12 },
});
