import { useQueryClient } from "@tanstack/react-query";
import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { isAddress } from "viem";
import { DesktopScreen } from "@/components/DesktopScreen";
import { applyAmountKey, Keypad } from "@/components/Keypad";
import { TokenPicker } from "@/components/TokenPicker";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts, typeScale } from "@/design-system/typography";
import { useIsWide } from "@/design-system/useResponsive";
import { DEFAULT_TOKEN } from "@/features/eerc/tokens/registry";
import { useEerc } from "@/features/eerc/useEerc";
import { accountEventsRepo } from "@/features/payments/accountEventsRepo";
import { formatTokenAmount } from "@/lib/money";
import { friendlyTxError } from "@/lib/txError";

export default function CashOut() {
  const { colors } = useTheme();
  const eerc = useEerc();
  const { withdraw, address } = eerc;
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string>(DEFAULT_TOKEN.address);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [destination, setDestination] = useState<"self" | "external">("self");
  const [recipient, setRecipient] = useState("");

  useEffect(() => setError(null), [token, amount, destination, recipient]);

  const bal = eerc.balanceFor(token);
  const available = Number(bal.parsed || "0");
  const value = Number(amount || "0");
  const overBalance = value > available;
  const canCashOut = value > 0 && !overBalance && bal.ready && !busy;
  const recipientTrimmed = recipient.trim();
  const recipientValid =
    isAddress(recipientTrimmed) &&
    recipientTrimmed.toLowerCase() !== address?.toLowerCase();
  const canSubmit = destination === "self" ? canCashOut : canCashOut && recipientValid;
  const presets = ["50", "100", "500"].filter((v) => Number(v) <= available);

  const onCashOut = async () => {
    if (!canCashOut) return;
    setBusy(true);
    setError(null);
    try {
      // The on-chain withdraw is the success boundary: once it resolves the money has
      // moved, so failing to record the activity row must NOT look like a failed cash-out.
      const { transactionHash } = await withdraw(amount, token);
      if (address) {
        try {
          await accountEventsRepo.record({
            tx_hash: transactionHash,
            address,
            kind: "withdraw",
          });
        } catch {
          // Best-effort — reconcile backfills this row on the next Activity load.
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["activity"] });
      router.back();
    } catch (err) {
      setError(
        friendlyTxError(err, {
          insufficient: "That's more than your balance.",
          fallback: "Couldn't cash out. Please try again.",
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  // Self → withdraw to your own wallet (above). External → hand off to the confirm
  // screen, which runs withdraw + ERC20 transfer behind the fat-finger guard.
  const onSubmit = () => {
    if (!canSubmit) return;
    if (destination === "self") {
      void onCashOut();
      return;
    }
    router.push({
      pathname: "/move-out-confirm",
      params: { to: recipientTrimmed, amount, token },
    });
  };

  const label = busy
    ? "Cashing out…"
    : !bal.ready
      ? "Loading your balance…"
      : overBalance
        ? "Not enough balance"
        : value <= 0
          ? "Enter an amount"
          : destination === "external"
            ? recipientValid
              ? `Review send $${amount}`
              : "Enter a valid address"
            : `Cash out $${amount}`;

  // Destination = where the cashed-out funds go. "self" is the original withdraw; "external"
  // collects an address and hands off to /move-out-confirm. Built once, rendered in both layouts.
  const destinationToggle = (
    <View style={[styles.toggle, { backgroundColor: colors.chip }]}>
      {(["self", "external"] as const).map((d) => {
        const on = destination === d;
        return (
          <Pressable
            key={d}
            onPress={() => setDestination(d)}
            style={[styles.toggleSeg, on ? { backgroundColor: colors.card } : null]}
          >
            <Text style={[styles.toggleText, { color: on ? colors.ink : colors.sub }]}>
              {d === "self" ? "To my wallet" : "To another address"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const methodCard = (
    <View style={[styles.method, { backgroundColor: colors.card, borderColor: colors.line }]}>
      <View style={[styles.methodIcon, { backgroundColor: colors.chip }]}>
        <Feather name="upload" size={20} color={colors.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.methodSub, { color: colors.sub }]}>Withdraw · {bal.token.symbol}</Text>
        <Text style={[styles.methodMain, { color: colors.ink }]}>To your wallet · Fuji testnet</Text>
      </View>
      <Feather name="chevron-right" size={20} color={colors.sub} />
    </View>
  );

  const recipientField = (
    <View style={styles.recipientWrap}>
      <TextInput
        value={recipient}
        onChangeText={setRecipient}
        placeholder="Paste the destination 0x address"
        placeholderTextColor={colors.sub}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.recipientInput,
          { backgroundColor: colors.card, color: colors.ink, borderColor: colors.line },
        ]}
      />
      {recipientTrimmed.length > 0 && !recipientValid ? (
        <Text style={[styles.recipientHint, { color: colors.avRed }]}>
          {recipientTrimmed.toLowerCase() === address?.toLowerCase()
            ? "That's your own wallet — use “To my wallet”."
            : "Enter a valid Fuji wallet address."}
        </Text>
      ) : (
        <Text style={[styles.recipientHint, { color: colors.sub }]}>
          Funds leave Hush to this external wallet.
        </Text>
      )}
    </View>
  );

  const destinationSection = (
    <View style={styles.destinationWrap}>
      {destinationToggle}
      {destination === "self" ? methodCard : recipientField}
    </View>
  );

  const isWide = useIsWide();

  if (isWide) {
    const desktopBody = (
      <>
        <View style={styles.selectorWrap}>
          <TokenPicker value={token} onChange={setToken} label="Cash out" />
        </View>

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
            Available {formatTokenAmount(bal.parsed || "0", bal.token)}
          </Text>
        </View>

        <View style={styles.presets}>
          {bal.ready && available > 0 ? (
            <Pressable
              onPress={() => setAmount(bal.parsed)}
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

        {destinationSection}

        <View style={styles.keypadWrapWide}>
          <Keypad onKey={(k) => setAmount((a) => applyAmountKey(a, k))} />
        </View>

        {error ? (
          <Text style={[styles.error, { color: colors.avRed }]}>{error}</Text>
        ) : null}
        <Button
          label={label}
          variant="primary"
          onPress={onSubmit}
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

      <View style={styles.selectorWrap}>
        <TokenPicker value={token} onChange={setToken} label="Cash out" />
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
          Available {formatTokenAmount(bal.parsed || "0", bal.token)}
        </Text>
      </View>

      <View style={styles.presets}>
        {bal.ready && available > 0 ? (
          <Pressable
            onPress={() => setAmount(bal.parsed)}
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

      {destinationSection}

      <View style={styles.keypadWrap}>
        <Keypad onKey={(k) => setAmount((a) => applyAmountKey(a, k))} />
      </View>

      {error ? (
        <Text style={[styles.error, { color: colors.avRed }]}>{error}</Text>
      ) : null}
      <Button
        label={label}
        variant="primary"
        onPress={onSubmit}
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
  selectorWrap: { alignItems: "center", marginTop: spacing.md },
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
  },
  methodIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  methodSub: { fontFamily: fonts.ui, fontSize: 12 },
  methodMain: { fontFamily: fonts.ui, fontSize: 14, fontWeight: "600" },
  destinationWrap: { marginTop: spacing.lg, gap: spacing.sm },
  toggle: { flexDirection: "row", borderRadius: radius.pill, padding: 3 },
  toggleSeg: { flex: 1, paddingVertical: 8, borderRadius: radius.pill, alignItems: "center" },
  toggleText: { fontFamily: fonts.ui, fontSize: 13, fontWeight: "600" },
  recipientWrap: { gap: 6 },
  recipientInput: {
    fontFamily: fonts.mono,
    fontSize: 13.5,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: radius.input,
    borderWidth: 1,
  },
  recipientHint: { fontFamily: fonts.ui, fontSize: 12, paddingHorizontal: 2 },
  keypadWrap: { marginTop: "auto", paddingTop: spacing.lg },
  keypadWrapWide: { marginTop: spacing.xl },
  error: { fontFamily: fonts.ui, fontSize: 13, textAlign: "center", marginBottom: spacing.sm },
  cta: { marginTop: spacing.sm, marginBottom: spacing.lg },
  ctaWide: { marginTop: spacing.xl },
});
