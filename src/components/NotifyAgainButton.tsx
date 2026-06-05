import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
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
      <Text style={[styles.chip, styles.muted, { backgroundColor: colors.chip, color: colors.sub }]}>
        🔔 {cooldown}
      </Text>
    );
  }
  return (
    <Pressable onPress={remind} disabled={busy}>
      <Text style={[styles.chip, styles.outline, { borderColor: colors.actBlue, color: colors.actBlue }]}>
        🔔 {busy ? "Notifying…" : "Notify again"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    fontFamily: fonts.ui,
    fontSize: 12.5,
    fontWeight: "700",
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: radius.button,
    overflow: "hidden",
  },
  outline: { borderWidth: 1.5 },
  muted: { fontWeight: "600" },
});
