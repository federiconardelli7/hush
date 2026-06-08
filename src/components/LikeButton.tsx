import Feather from "@expo/vector-icons/Feather";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { type GestureResponderEvent, Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "@/design-system/theme";
import { fonts } from "@/design-system/typography";
import { likesRepo } from "@/features/social/likesRepo";
import { DEFAULT_REACTION } from "@/features/social/reactions";

// Reaction button (feed row): shows my reaction emoji, or an outline heart if I haven't
// reacted, plus the total count. Tap toggles my reaction — adds ❤️ if none, removes it if I
// have one. (Picking a different emoji happens in the thread's ReactionPicker.) Optimistic
// local state; reconciled by invalidating feed-social + thread; stopPropagation so the tap
// doesn't also fire an enclosing row Pressable.
export function LikeButton({
  txHash,
  myEmoji,
  count,
  me,
  size = 16,
}: {
  txHash: string;
  myEmoji: string | null;
  count: number;
  me: string | undefined;
  size?: number;
}) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [optimistic, setOptimistic] = useState<{ emoji: string | null; count: number } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  const shownEmoji = optimistic ? optimistic.emoji : myEmoji;
  const shownCount = optimistic ? optimistic.count : count;
  const reacted = shownEmoji != null;

  const toggle = async () => {
    if (!me || busy) return;
    const removing = reacted;
    setOptimistic({
      emoji: removing ? null : DEFAULT_REACTION,
      count: Math.max(0, shownCount + (removing ? -1 : 1)),
    });
    setBusy(true);
    try {
      if (removing) {
        await likesRepo.remove(txHash, me);
      } else {
        await likesRepo.add(txHash, me, DEFAULT_REACTION);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["feed-social"] }),
        queryClient.invalidateQueries({ queryKey: ["thread", txHash] }),
      ]);
    } catch {
      // finally clears the optimistic override either way
    } finally {
      setOptimistic(null);
      setBusy(false);
    }
  };

  const onPress = (e: GestureResponderEvent) => {
    e.stopPropagation();
    void toggle();
  };

  return (
    <Pressable onPress={onPress} disabled={!me} style={styles.btn} hitSlop={8}>
      {reacted ? (
        <Text style={{ fontSize: size }}>{shownEmoji}</Text>
      ) : (
        <Feather name="heart" size={size} color={colors.sub} />
      )}
      {shownCount > 0 ? (
        <Text style={[styles.count, { color: reacted ? colors.ink : colors.sub }]}>
          {shownCount}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: "row", alignItems: "center", gap: 5 },
  count: { fontFamily: fonts.ui, fontSize: 12.5, fontWeight: "600" },
});
