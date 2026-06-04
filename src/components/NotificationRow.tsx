import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/design-system/primitives/Avatar";
import { useTheme } from "@/design-system/theme";
import { fonts } from "@/design-system/typography";
import type { NotificationItem } from "@/features/notifications/useNotifications";
import { formatDateTime } from "@/features/payments/dateGroups";
import { displayName } from "@/lib/identity";

const META: Record<string, { icon: string; verb: string }> = {
  received: { icon: "💸", verb: " paid you" },
  request: { icon: "🙋", verb: " requested money" },
  declined: { icon: "🚫", verb: " declined your request" },
};

// One notification: a received payment (→ its receipt), an incoming money request,
// or your request being declined (both → the requests inbox). Shows the date; unread
// rows get a subtle tint + a dot.
export function NotificationRow({
  item,
  unread,
}: {
  item: NotificationItem;
  unread: boolean;
}) {
  const { colors } = useTheme();
  const name = displayName(item.other, item.otherAddress);
  const meta = META[item.kind] ?? META.received;

  const onPress = () => {
    if (item.kind === "received") {
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
    } else {
      router.push("/requests");
    }
  };

  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, unread ? { backgroundColor: "rgba(37,99,235,0.06)" } : null]}
    >
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
        {item.kind === "declined" && item.declineReason ? (
          <Text style={[styles.reason, { color: colors.sub }]} numberOfLines={1}>
            “{item.declineReason}”
          </Text>
        ) : null}
        <Text style={[styles.time, { color: colors.sub }]}>
          {formatDateTime(item.created_at)}
        </Text>
      </View>
      {unread ? <View style={[styles.dot, { backgroundColor: colors.actBlue }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginBottom: 2,
  },
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
  reason: { fontFamily: fonts.ui, fontSize: 12.5, marginTop: 1 },
  time: { fontFamily: fonts.ui, fontSize: 12, marginTop: 1 },
  dot: { width: 9, height: 9, borderRadius: 5 },
});
