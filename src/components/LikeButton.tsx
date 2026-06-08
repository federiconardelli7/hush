import Feather from "@expo/vector-icons/Feather";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { type GestureResponderEvent, Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "@/design-system/theme";
import { fonts } from "@/design-system/typography";
import { likesRepo } from "@/features/social/likesRepo";

// Heart + count. The codebase has no useMutation, so the tap toggles optimistic local
// state for instant feedback, writes through likesRepo, then invalidates the feed-social
// + thread queries to reconcile (reverts the optimistic state on failure). With no `me`
// (not signed in / no wallet yet) it's a read-only count. stopPropagation keeps the tap
// from also firing an enclosing row Pressable (the feed card → receipt/thread).
export function LikeButton({
  txHash,
  liked,
  count,
  me,
  size = 16,
}: {
  txHash: string;
  liked: boolean;
  count: number;
  me: string | undefined;
  size?: number;
}) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [optimistic, setOptimistic] = useState<{ liked: boolean; count: number } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  const shownLiked = optimistic?.liked ?? liked;
  const shownCount = optimistic?.count ?? count;

  const toggle = async () => {
    if (!me || busy) return;
    const next = !shownLiked;
    setOptimistic({ liked: next, count: Math.max(0, shownCount + (next ? 1 : -1)) });
    setBusy(true);
    try {
      if (next) {
        await likesRepo.add(txHash, me);
      } else {
        await likesRepo.remove(txHash, me);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["feed-social"] }),
        queryClient.invalidateQueries({ queryKey: ["thread", txHash] }),
      ]);
    } catch {
      // swallow — the finally clears the optimistic override either way
    } finally {
      // Drop the optimistic override so the reconciled server props take over: on
      // success they reflect the new state (invalidateQueries awaited the refetch); on
      // failure the props are unchanged, so this reverts the tap.
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
      <Feather name="heart" size={size} color={shownLiked ? colors.avRed : colors.sub} />
      {shownCount > 0 ? (
        <Text style={[styles.count, { color: shownLiked ? colors.avRed : colors.sub }]}>
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
