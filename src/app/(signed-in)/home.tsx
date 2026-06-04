import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { BalanceCard } from "@/components/BalanceCard";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { useRequests } from "@/features/requests/useRequests";
import { formatMoney } from "@/lib/money";

export default function Home() {
  const { colors } = useTheme();
  const eerc = useEerc();
  const requests = useRequests(eerc.address?.toLowerCase());
  const pendingCount = (requests.data?.incoming ?? []).filter(
    (r) => r.status === "pending",
  ).length;
  const [busy, setBusy] = useState<"register" | "unlock" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: "register" | "unlock") => {
    if (busy) return;
    setBusy(kind);
    setError(null);
    try {
      await (kind === "register" ? eerc.register() : eerc.enableDecryption());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  if (eerc.status === "preparing") {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={colors.actBlue} />
          <Text style={[styles.note, { color: colors.sub }]}>
            {eerc.walletError ?? "Setting up your private wallet…"}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const balanceUnlocked = eerc.isRegistered && eerc.isDecryptionKeySet;

  return (
    <ScreenContainer>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.push("/requests")} style={styles.bell}>
          <Text style={styles.bellIcon}>🔔</Text>
          {pendingCount > 0 ? (
            <View
              style={[
                styles.dot,
                { backgroundColor: colors.actBlue, borderColor: colors.bg },
              ]}
            />
          ) : null}
        </Pressable>
      </View>
      <BalanceCard
        balance={balanceUnlocked ? formatMoney(eerc.parsedBalance) : "••••"}
      />

      {!eerc.isRegistered ? (
        <View style={styles.gate}>
          <Text style={[styles.note, { color: colors.sub }]}>
            Finish setting up your private account — one signature plus a quick
            on-chain step. Amounts stay encrypted.
          </Text>
          <Button
            label={busy === "register" ? "Preparing private setup…" : "Finish setup"}
            variant="primary"
            onPress={() => run("register")}
          />
        </View>
      ) : !eerc.isDecryptionKeySet ? (
        <View style={styles.gate}>
          <Text style={[styles.note, { color: colors.sub }]}>
            Unlock your balance with a quick signature — it never leaves this
            device.
          </Text>
          <Button
            label={busy === "unlock" ? "Unlocking…" : "Show balance"}
            variant="primary"
            onPress={() => run("unlock")}
          />
        </View>
      ) : (
        <>
          <View style={styles.row}>
            <Button
              label="Add"
              variant="primary"
              style={styles.cell}
              onPress={() => router.push("/add-money")}
            />
            <Button
              label="Send"
              variant="secondary"
              style={styles.cell}
              onPress={() => router.push("/pay")}
            />
          </View>
          <View style={styles.row}>
            <Button
              label="Request"
              variant="secondary"
              style={styles.cell}
              onPress={() =>
                router.push({ pathname: "/pay", params: { mode: "request" } })
              }
            />
            <Button
              label="Cash out"
              variant="secondary"
              style={styles.cell}
              onPress={() => router.push("/cash-out")}
            />
          </View>
        </>
      )}

      {error ? (
        <Text style={[styles.error, { color: colors.avRed }]}>{error}</Text>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", justifyContent: "flex-end", marginBottom: spacing.sm },
  bell: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  bellIcon: { fontSize: 22 },
  dot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  gate: { gap: spacing.md, marginTop: spacing.lg },
  note: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 21, textAlign: "center" },
  row: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  cell: { flex: 1 },
  error: {
    fontFamily: fonts.ui,
    fontSize: 13,
    marginTop: spacing.md,
    textAlign: "center",
  },
});
