import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ActivityRow } from "@/components/ActivityRow";
import { BalanceCard } from "@/components/BalanceCard";
import { DesktopScreen } from "@/components/DesktopScreen";
import { Button } from "@/design-system/primitives/Button";
import { ScreenContainer } from "@/design-system/primitives/ScreenContainer";
import { useTheme } from "@/design-system/theme";
import { onDarkCard, radius, shadow, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { useIsWide } from "@/design-system/useResponsive";
import { useEerc } from "@/features/eerc/useEerc";
import { useReadIds } from "@/features/notifications/seen";
import { isUnreadKind, useNotifications } from "@/features/notifications/useNotifications";
import { useActivity } from "@/features/payments/useActivity";
import { displayName } from "@/lib/identity";
import { formatMoney } from "@/lib/money";

export default function Home() {
  const { colors } = useTheme();
  const isWide = useIsWide();
  const eerc = useEerc();
  const me = eerc.address?.toLowerCase();
  const activity = useActivity(me);
  const notifications = useNotifications(me);
  const readIds = useReadIds(me);
  const unread = (notifications.data ?? []).filter(
    (n) => isUnreadKind(n.kind) && !readIds.has(n.id),
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

  // Desktop only kicks in once registered + unlocked; the loading/register/unlock
  // gates below stay on the shared mobile return so the eERC flow is identical.
  if (isWide && balanceUnlocked) {
    const recent = (activity.data ?? []).slice(0, 5);
    const tiles: {
      key: string;
      icon: React.ComponentProps<typeof Feather>["name"];
      label: string;
      primary?: boolean;
      onPress: () => void;
    }[] = [
      { key: "add", icon: "plus", label: "Add", primary: true, onPress: () => router.push("/add-money") },
      {
        key: "send",
        icon: "arrow-up-right",
        label: "Send",
        onPress: () => router.push({ pathname: "/pay", params: { mode: "pay" } }),
      },
      {
        key: "request",
        icon: "arrow-down-left",
        label: "Request",
        onPress: () => router.push({ pathname: "/pay", params: { mode: "request" } }),
      },
      { key: "cashout", icon: "dollar-sign", label: "Cash out", onPress: () => router.push("/cash-out") },
    ];

    return (
      <DesktopScreen title="Home" maxWidth={760}>
        <View style={[styles.balanceCard, { backgroundColor: "#16161B" }, shadow.card]}>
          <View style={styles.balanceLeft}>
            <View style={styles.balanceTopRow}>
              <Text style={styles.balanceLabel}>Total balance</Text>
              <View style={styles.privatePill}>
                <Feather name="lock" size={11} color="#fff" />
                <Text style={styles.privatePillText}>Private</Text>
              </View>
            </View>
            <Text style={styles.balanceValue}>{formatMoney(eerc.parsedBalance)}</Text>
          </View>
          <View style={styles.tiles}>
            {tiles.map((t) => (
              <Pressable key={t.key} onPress={t.onPress} style={styles.tileWrap}>
                <View
                  style={[
                    styles.tile,
                    t.primary
                      ? [{ backgroundColor: colors.actBlue }, shadow.buttonBlue]
                      : styles.tileGhost,
                  ]}
                >
                  <Feather name={t.icon} size={22} color="#fff" />
                </View>
                <Text style={styles.tileCaption}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.activityHeader}>
          <Text style={[styles.activityTitle, { color: colors.ink }]}>Recent activity</Text>
          <Pressable onPress={() => router.push("/activity")} style={styles.seeAllWrap}>
            <Text style={[styles.seeAll, { color: colors.actBlue }]}>See all</Text>
          </Pressable>
        </View>
        <View style={[styles.activityCard, { backgroundColor: colors.card }]}>
          {recent.length === 0 ? (
            <Text style={[styles.empty, { color: colors.sub }]}>
              {activity.isLoading ? "Loading…" : "No activity yet."}
            </Text>
          ) : (
            recent.map((p, i) => (
              <Pressable
                key={p.tx_hash}
                onPress={() =>
                  router.push({
                    pathname: "/receipt",
                    params: {
                      txHash: p.tx_hash,
                      kind: p.kind,
                      name:
                        p.kind === "deposit" || p.kind === "withdraw"
                          ? ""
                          : displayName(p.counterparty, p.counterpartyAddress ?? ""),
                      address: p.counterpartyAddress ?? "",
                      caption: p.caption ?? "",
                      createdAt: p.created_at,
                    },
                  })
                }
                style={i ? { borderTopWidth: 1, borderTopColor: colors.line } : undefined}
              >
                <ActivityRow item={p} />
              </Pressable>
            ))
          )}
        </View>
      </DesktopScreen>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.push("/notifications")} style={styles.bell}>
          <Feather name="bell" size={22} color={colors.ink} />
          {unread > 0 ? (
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
              onPress={() =>
                router.push({ pathname: "/pay", params: { mode: "pay" } })
              }
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
  balanceCard: {
    borderRadius: radius.cardLg,
    padding: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.lg,
  },
  balanceLeft: { minWidth: 0 },
  balanceTopRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  balanceLabel: {
    fontFamily: fonts.ui,
    fontSize: 13.5,
    fontWeight: "600",
    color: onDarkCard.label,
  },
  privatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: onDarkCard.pill,
  },
  privatePillText: {
    fontFamily: fonts.ui,
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  balanceValue: {
    fontFamily: fonts.display,
    fontSize: 46,
    fontWeight: "800",
    color: "#fff",
    marginTop: spacing.sm,
  },
  tiles: { flexDirection: "row", gap: 10 },
  tileWrap: { alignItems: "center" },
  tile: {
    width: 52,
    height: 52,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
  },
  tileGhost: { backgroundColor: onDarkCard.ghost },
  tileCaption: {
    fontFamily: fonts.ui,
    fontSize: 11.5,
    fontWeight: "600",
    color: onDarkCard.caption,
    marginTop: 6,
    textAlign: "center",
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 30,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  activityTitle: { fontFamily: fonts.ui, fontSize: 17, fontWeight: "700" },
  seeAllWrap: { marginLeft: "auto" },
  seeAll: { fontFamily: fonts.ui, fontSize: 13.5, fontWeight: "600" },
  activityCard: { borderRadius: radius.card, paddingHorizontal: 16 },
  empty: {
    fontFamily: fonts.ui,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
});
