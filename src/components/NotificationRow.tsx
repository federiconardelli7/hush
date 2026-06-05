import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { NotifyAgainButton } from "@/components/NotifyAgainButton";
import { Avatar } from "@/design-system/primitives/Avatar";
import { useTheme } from "@/design-system/theme";
import { radius } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import type { NotificationItem } from "@/features/notifications/useNotifications";
import { formatDateTime, relativeShort } from "@/features/payments/dateGroups";
import { useEerc } from "@/features/eerc/useEerc";
import { displayName } from "@/lib/identity";
import { formatMoney } from "@/lib/money";

const META: Record<string, { icon: string; verb: string }> = {
  received: { icon: "💸", verb: " paid you" },
  request: { icon: "🙋", verb: " requested money" },
  outgoing: { icon: "🔔", verb: " — you asked" },
  declined: { icon: "🚫", verb: " declined your request" },
};

// One inbox row. Received → tap to its receipt. Incoming request → decrypted amount + a
// prefilled Pay (no more opening the full requests log). Your outgoing request → Notify
// again / cooldown. Declined → the reason. Unread rows get a leading dot + a tint;
// tapping a row (or its Pay) marks it read via onRead.
export function NotificationRow({
  item,
  unread,
  onRead,
}: {
  item: NotificationItem;
  unread: boolean;
  onRead?: () => void;
}) {
  const { colors } = useTheme();
  const eerc = useEerc();
  const name = displayName(item.other, item.otherAddress);
  const meta = META[item.kind] ?? META.received;

  // Incoming requests decrypt their amount on-device (behind the unlock gate), reusing
  // the same ["req-amount", id] cache as the Requests list.
  const amount = useQuery({
    queryKey: ["req-amount", item.requestId],
    enabled: item.kind === "request" && eerc.isDecryptionKeySet && !!item.amountPct,
    staleTime: Infinity,
    queryFn: () => eerc.decryptRequestAmount(item.amountPct!),
  });

  const pay = () => {
    if (amount.data == null) return;
    onRead?.();
    router.push({
      pathname: "/pay-amount",
      params: {
        to: item.requesterAddress ?? item.otherAddress,
        name,
        requestId: item.requestId ?? "",
        amount: amount.data,
      },
    });
  };

  const openReceipt = () => {
    onRead?.();
    router.push({
      pathname: "/receipt",
      params: {
        txHash: item.txHash ?? "",
        kind: "received",
        name,
        address: item.otherAddress,
        caption: item.caption ?? "",
        createdAt: item.created_at,
      },
    });
  };

  let sub: string | null = null;
  if (item.kind === "declined" && item.declineReason) sub = `“${item.declineReason}”`;
  else if (item.kind === "outgoing")
    sub = `${item.note ? item.note + " · " : ""}${
      item.lastRemindedAt
        ? `reminded ${relativeShort(item.lastRemindedAt)}`
        : `asked ${relativeShort(item.created_at)}`
    }`;
  else if (item.note) sub = item.note;

  let right: ReactNode = (
    <Text style={[styles.time, { color: colors.sub }]}>{formatDateTime(item.created_at)}</Text>
  );
  if (item.kind === "request") {
    const amountText = !eerc.isDecryptionKeySet
      ? "🔒"
      : amount.isPending
        ? "···"
        : amount.data == null
          ? "—"
          : formatMoney(amount.data);
    right = (
      <View style={styles.rightCol}>
        <Text style={[styles.amount, { color: colors.ink }]}>{amountText}</Text>
        {eerc.isDecryptionKeySet && amount.data != null ? (
          <Pressable onPress={pay}>
            <Text style={[styles.pay, { backgroundColor: colors.actBlue }]}>Pay</Text>
          </Pressable>
        ) : null}
      </View>
    );
  } else if (item.kind === "outgoing" && item.requestId) {
    right = (
      <NotifyAgainButton
        requestId={item.requestId}
        lastRemindedAt={item.lastRemindedAt}
        createdAt={item.created_at}
      />
    );
  }

  const body = (
    <>
      <View style={styles.lead}>
        {unread ? <View style={[styles.leadDot, { backgroundColor: colors.actBlue }]} /> : null}
      </View>
      <View style={styles.iconWrap}>
        <Avatar name={name} size={42} />
        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
          <Text style={styles.badgeIcon}>{meta.icon}</Text>
        </View>
      </View>
      <View style={styles.who}>
        <Text style={[styles.line, { color: colors.ink }]} numberOfLines={1}>
          <Text style={styles.bold}>{name}</Text>
          <Text style={{ color: colors.sub }}>{meta.verb}</Text>
        </Text>
        {sub ? (
          <Text style={[styles.subline, { color: colors.sub }]} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right}
    </>
  );

  const rowStyle = [
    styles.row,
    unread ? { backgroundColor: "rgba(37,99,235,0.08)" } : null,
  ];

  // Received & declined tap the whole row (received → receipt, declined → just mark read);
  // requests act via their Pay chip, outgoing via Notify again.
  if (item.kind === "received") {
    return (
      <Pressable onPress={openReceipt} style={rowStyle}>
        {body}
      </Pressable>
    );
  }
  if (item.kind === "declined") {
    return (
      <Pressable onPress={() => onRead?.()} style={rowStyle}>
        {body}
      </Pressable>
    );
  }
  return <View style={rowStyle}>{body}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    marginBottom: 2,
  },
  lead: { width: 10, alignItems: "center" },
  leadDot: { width: 8, height: 8, borderRadius: 4 },
  iconWrap: { position: "relative" },
  badge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeIcon: { fontSize: 11 },
  who: { flex: 1, minWidth: 0 },
  line: { fontFamily: fonts.ui, fontSize: 14.5 },
  bold: { fontWeight: "700" },
  subline: { fontFamily: fonts.ui, fontSize: 12.5, marginTop: 1 },
  time: { fontFamily: fonts.ui, fontSize: 11.5 },
  rightCol: { alignItems: "flex-end", gap: 5 },
  amount: { fontFamily: fonts.ui, fontSize: 15, fontWeight: "700" },
  pay: {
    fontFamily: fonts.ui,
    fontSize: 12.5,
    fontWeight: "700",
    color: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: radius.button,
    overflow: "hidden",
  },
});
