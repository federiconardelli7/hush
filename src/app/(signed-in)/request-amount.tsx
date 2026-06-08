import Feather from "@expo/vector-icons/Feather";
import { useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { DesktopScreen } from "@/components/DesktopScreen";
import { applyAmountKey, Keypad } from "@/components/Keypad";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TokenChip } from "@/components/TokenChip";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";
import { useIsWide } from "@/design-system/useResponsive";
import { DEFAULT_TOKEN } from "@/features/eerc/tokens/registry";
import { useEerc } from "@/features/eerc/useEerc";
import { requestsRepo } from "@/features/requests/requestsRepo";

export default function RequestAmount() {
  const { colors } = useTheme();
  const { to, name } = useLocalSearchParams<{ to: string; name?: string }>();
  const { address, encryptAmountFor } = useEerc();
  const me = address?.toLowerCase();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<string>(DEFAULT_TOKEN.address);
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Reset when the screen is (re)opened — it's a single reused route, so a prior
  // success/amount would otherwise block a second request to the same person.
  useFocusEffect(
    useCallback(() => {
      setAmount("");
      setToken(DEFAULT_TOKEN.address);
      setMemo("");
      setBusy(false);
      setError(null);
      setDone(false);
    }, []),
  );

  const value = Number(amount || "0");
  const recipient = (to ?? "") as `0x${string}`;

  const onRequest = async () => {
    if (value <= 0 || busy || !me || !recipient) return;
    setBusy(true);
    setError(null);
    try {
      // Encrypt the amount to the requestee (so they can read it) AND to myself
      // (so I can see my own sent request). No plaintext amount is stored.
      const [encRequestee, encRequester] = await Promise.all([
        encryptAmountFor(recipient, amount),
        encryptAmountFor(me, amount),
      ]);
      await requestsRepo.create({
        requester_address: me,
        requestee_address: recipient,
        amount_enc_requestee: encRequestee,
        amount_enc_requester: encRequester,
        token_address: token,
        note: memo.trim() || undefined,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["requests"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the request.");
    } finally {
      setBusy(false);
    }
  };

  const isWide = useIsWide();

  if (done) {
    if (isWide) {
      return (
        <DesktopScreen title="Request" center maxWidth={460}>
          <View style={styles.successWrap}>
            <Feather name="check" size={56} color={colors.positive} />
            <Text style={[typeScale.screenTitle, { color: colors.ink }]}>
              Requested from {name ?? "them"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
              <Feather name="lock" size={14} color={colors.sub} />
              <Text style={[styles.successSub, { color: colors.sub }]}>
                The amount is encrypted — only you two can read it.
              </Text>
            </View>
            <Button
              label="Done"
              variant="primary"
              onPress={() => router.replace("/home")}
              style={styles.successCta}
            />
          </View>
        </DesktopScreen>
      );
    }
    return (
      <ScreenContainer maxWidth={460}>
        <View style={styles.successWrap}>
          <Feather name="check" size={56} color={colors.positive} />
          <Text style={[typeScale.screenTitle, { color: colors.ink }]}>
            Requested from {name ?? "them"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
            <Feather name="lock" size={14} color={colors.sub} />
            <Text style={[styles.successSub, { color: colors.sub }]}>
              The amount is encrypted — only you two can read it.
            </Text>
          </View>
          <Button
            label="Done"
            variant="primary"
            onPress={() => router.replace("/home")}
            style={styles.successCta}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (isWide) {
    return (
      <DesktopScreen title={`Request ${name ?? ""}`.trim()} back center maxWidth={460}>
        <View style={[styles.amountWrap, styles.amountWrapWide]}>
          <Text style={[typeScale.amount, styles.amount, { color: colors.ink }]}>
            <Text style={[styles.dollar, { color: colors.sub }]}>$</Text>
            {amount || "0"}
          </Text>
          <TokenChip value={token} onChange={setToken} />
        </View>

        <TextInput
          value={memo}
          onChangeText={setMemo}
          placeholder="What's it for?"
          placeholderTextColor={colors.sub}
          maxLength={200}
          style={[
            styles.memo,
            { backgroundColor: colors.card, color: colors.ink, borderColor: colors.line },
          ]}
        />

        <View style={[styles.keypadWrap, styles.keypadWrapWide]}>
          <Keypad onKey={(k) => setAmount((x) => applyAmountKey(x, k))} />
        </View>

        {error ? <Text style={[styles.error, { color: colors.avRed }]}>{error}</Text> : null}
        <Button
          label={busy ? "Sending request…" : value > 0 ? `Request $${amount}` : "Enter an amount"}
          variant="primary"
          onPress={onRequest}
          style={[styles.cta, styles.ctaWide]}
        />
        <Text style={[styles.footnote, { color: colors.sub }]}>
          The amount is encrypted — only you two can read it.
        </Text>
      </DesktopScreen>
    );
  }

  return (
    <ScreenContainer maxWidth={460}>
      <ScreenHeader title={`Request ${name ?? ""}`.trim()} />

      <View style={styles.amountWrap}>
        <Text style={[typeScale.amount, styles.amount, { color: colors.ink }]}>
          <Text style={[styles.dollar, { color: colors.sub }]}>$</Text>
          {amount || "0"}
        </Text>
        <TokenChip value={token} onChange={setToken} />
      </View>

      <TextInput
        value={memo}
        onChangeText={setMemo}
        placeholder="What's it for?"
        placeholderTextColor={colors.sub}
        maxLength={200}
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
        label={busy ? "Sending request…" : value > 0 ? `Request $${amount}` : "Enter an amount"}
        variant="primary"
        onPress={onRequest}
        style={styles.cta}
      />
      <Text style={[styles.footnote, { color: colors.sub }]}>
        The amount is encrypted — only you two can read it.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  amountWrap: { alignItems: "center", marginTop: spacing.xl, gap: spacing.sm, zIndex: 20 },
  amountWrapWide: { marginTop: spacing.xl + spacing.sm },
  amount: { fontFamily: fonts.display },
  dollar: { fontSize: 34, fontWeight: "700" },
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
  keypadWrapWide: { marginTop: spacing.xl },
  error: { fontFamily: fonts.ui, fontSize: 13, textAlign: "center", marginBottom: spacing.sm },
  cta: { marginTop: spacing.sm },
  ctaWide: { marginTop: spacing.xl },
  successCta: { alignSelf: "stretch", marginTop: spacing.lg },
  footnote: { fontFamily: fonts.ui, fontSize: 12, textAlign: "center", paddingVertical: spacing.md },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  successSub: { fontFamily: fonts.ui, fontSize: 14, textAlign: "center", maxWidth: 280 },
});
