import Feather from "@expo/vector-icons/Feather";
import { type GestureResponderEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { LikeButton } from "@/components/LikeButton";
import { Avatar } from "@/design-system/primitives/Avatar";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import type { FeedItem } from "@/features/payments/useFeed";
import type { FeedSocial } from "@/features/social/useFeedSocial";
import { displayName } from "@/lib/identity";

function timeAgo(iso: string): string {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// A feed card: who paid whom, time, the lock "Hidden" chip (amount never shown), the
// optional public caption, and — when social data is supplied — a like + comment action
// bar. The heart toggles in place; the comment pill opens the payment thread. Both stop
// propagation so they don't also fire an enclosing row Pressable.
export function FeedRow({
  item,
  social,
  me,
  onOpenThread,
}: {
  item: FeedItem;
  social?: FeedSocial;
  me?: string;
  onOpenThread?: () => void;
}) {
  const { colors } = useTheme();
  const sender = displayName(item.sender, item.sender_address);
  const receiver = displayName(item.receiver, item.receiver_address);

  const openThread = (e: GestureResponderEvent) => {
    e.stopPropagation();
    onOpenThread?.();
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.row}>
        <Avatar name={sender} size={40} />
        <View style={styles.who}>
          <Text style={[styles.line, { color: colors.ink }]}>
            <Text style={styles.bold}>{sender}</Text>
            <Text style={{ color: colors.sub }}> paid </Text>
            <Text style={styles.bold}>{receiver}</Text>
          </Text>
          <Text style={[styles.time, { color: colors.sub }]}>
            {timeAgo(item.created_at)}
          </Text>
        </View>
        <View style={[styles.chip, { backgroundColor: colors.chip }]}>
          <Feather name="lock" size={11} color={colors.sub} />
          <Text style={[styles.chipText, { color: colors.sub }]}>Hidden</Text>
        </View>
      </View>
      {item.caption ? (
        <Text style={[styles.note, { color: colors.ink }]}>{item.caption}</Text>
      ) : null}
      {social && onOpenThread ? (
        <View style={[styles.actions, { borderTopColor: colors.line }]}>
          <LikeButton
            txHash={item.tx_hash}
            liked={social.likedByMe}
            count={social.likeCount}
            me={me}
          />
          <Pressable onPress={openThread} style={styles.commentBtn} hitSlop={8}>
            <Feather name="message-circle" size={16} color={colors.sub} />
            {social.commentCount > 0 ? (
              <Text style={[styles.count, { color: colors.sub }]}>
                {social.commentCount}
              </Text>
            ) : null}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, padding: 16, marginBottom: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: 13 },
  who: { flex: 1, minWidth: 0 },
  line: { fontFamily: fonts.ui, fontSize: 14.5 },
  bold: { fontWeight: "700" },
  time: { fontFamily: fonts.ui, fontSize: 12, marginTop: 1 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  chipText: { fontFamily: fonts.ui, fontSize: 11, fontWeight: "600" },
  note: { fontFamily: fonts.ui, fontSize: 14, marginTop: 11 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
  },
  commentBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  count: { fontFamily: fonts.ui, fontSize: 12.5, fontWeight: "600" },
});
