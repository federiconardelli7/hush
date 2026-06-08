import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/design-system/theme";
import { radius } from "@/design-system/tokens";
import { likesRepo } from "@/features/social/likesRepo";
import { REACTION_EMOJIS } from "@/features/social/reactions";

// The pick-one emoji row (thread). Tap an emoji to set/replace my reaction; tap my current
// one to remove it. Writes through likesRepo, then invalidates the thread + feed-social so
// both reconcile. One reaction per person (the likes PK enforces it).
export function ReactionPicker({
  txHash,
  myEmoji,
  me,
}: {
  txHash: string;
  myEmoji: string | null;
  me: string | undefined;
}) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const pick = async (emoji: string) => {
    if (!me || busy) return;
    setBusy(true);
    try {
      if (myEmoji === emoji) {
        await likesRepo.remove(txHash, me);
      } else {
        await likesRepo.add(txHash, me, emoji);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["thread", txHash] }),
        queryClient.invalidateQueries({ queryKey: ["feed-social"] }),
      ]);
    } catch {
      // non-fatal; the thread re-renders from the (unchanged) server state
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.row}>
      {REACTION_EMOJIS.map((emoji) => {
        const on = myEmoji === emoji;
        return (
          <Pressable
            key={emoji}
            onPress={() => void pick(emoji)}
            disabled={!me}
            hitSlop={4}
            style={[
              styles.chip,
              { backgroundColor: on ? colors.actBlue + "22" : colors.chip },
              on ? { borderColor: colors.actBlue, borderWidth: 1 } : null,
            ]}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 20 },
});
