import Feather from "@expo/vector-icons/Feather";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/design-system/theme";
import { radius } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { notifyCooldown } from "@/features/payments/dateGroups";
import { requestsRepo } from "@/features/requests/requestsRepo";

// Outline "Notify again" chip for an outgoing pending request. Once tapped it becomes a
// muted "Notify in Xh" cooldown chip (24h). Shared by the inbox and the Requests list;
// re-surfaces the request in the requestee's notifications (requestsRepo.remind).
export function NotifyAgainButton({
  requestId,
  lastRemindedAt,
  createdAt,
}: {
  requestId: string;
  lastRemindedAt: string | null | undefined;
  createdAt: string;
}) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const cooldown = notifyCooldown(lastRemindedAt, createdAt);

  const remind = async () => {
    if (cooldown || busy) return;
    setBusy(true);
    try {
      await requestsRepo.remind(requestId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["requests"] }),
      ]);
    } catch {
      // surfaced by the ErrorBoundary if it throws synchronously
    } finally {
      setBusy(false);
    }
  };

  if (cooldown) {
    return (
      <View style={[styles.chip, { backgroundColor: colors.chip }]}>
        <Feather name="bell" size={14} color={colors.sub} />
        <Text style={[styles.chipText, styles.muted, { color: colors.sub }]}>{cooldown}</Text>
      </View>
    );
  }
  return (
    <Pressable onPress={remind} disabled={busy}>
      <View style={[styles.chip, styles.outline, { borderColor: colors.actBlue }]}>
        <Feather name="bell" size={14} color={colors.actBlue} />
        <Text style={[styles.chipText, { color: colors.actBlue }]}>
          {busy ? "Notifying…" : "Notify again"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: radius.button,
    overflow: "hidden",
  },
  chipText: { fontFamily: fonts.ui, fontSize: 12.5, fontWeight: "700" },
  outline: { borderWidth: 1.5 },
  muted: { fontWeight: "600" },
});
