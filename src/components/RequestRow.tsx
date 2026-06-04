import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Avatar } from "@/design-system/primitives/Avatar";
import { Button } from "@/design-system/primitives/Button";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { requestsRepo } from "@/features/requests/requestsRepo";
import type { RequestItem } from "@/features/requests/useRequests";
import { displayName } from "@/lib/identity";
import { formatMoney } from "@/lib/money";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  fulfilled: "Paid ✓",
  declined: "Declined",
  canceled: "Canceled",
};

// One request row. The amount is decrypted on-device from the ciphertext addressed
// to me (behind the unlock gate). Incoming + pending → Pay / Decline (Decline opens
// an inline confirm with an optional reason); outgoing + pending → Cancel.
export function RequestRow({
  item,
  direction,
}: {
  item: RequestItem;
  direction: "incoming" | "outgoing";
}) {
  const { colors } = useTheme();
  const eerc = useEerc();
  const queryClient = useQueryClient();
  const incoming = direction === "incoming";
  const otherAddr = incoming ? item.requester_address : item.requestee_address;
  const name = displayName(item.other, otherAddr);
  const pct = incoming ? item.amount_enc_requestee : item.amount_enc_requester;
  const pending = item.status === "pending";
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const amount = useQuery({
    queryKey: ["req-amount", item.id],
    enabled: eerc.isDecryptionKeySet,
    staleTime: Infinity,
    queryFn: () => eerc.decryptRequestAmount(pct),
  });

  let amountText: string;
  if (!eerc.isDecryptionKeySet) amountText = "🔒";
  else if (amount.isPending) amountText = "···";
  else if (amount.data == null) amountText = "—";
  else amountText = formatMoney(amount.data);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["requests"] });

  const confirmDecline = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await requestsRepo.setStatus(
        item.id,
        "declined",
        undefined,
        reason.trim() || undefined,
      );
      await invalidate();
    } finally {
      setBusy(false);
    }
  };
  const cancel = async () => {
    await requestsRepo.setStatus(item.id, "canceled");
    await invalidate();
  };
  const pay = () => {
    if (amount.data == null) return;
    router.push({
      pathname: "/pay-amount",
      params: { to: item.requester_address, name, requestId: item.id, amount: amount.data },
    });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.row}>
        <Avatar name={name} size={42} />
        <View style={styles.who}>
          <Text style={[styles.line, { color: colors.ink }]} numberOfLines={1}>
            <Text style={styles.bold}>{name}</Text>
            <Text style={{ color: colors.sub }}>
              {incoming ? " requests" : " — you asked"}
            </Text>
          </Text>
          {item.note ? (
            <Text style={[styles.note, { color: colors.ink }]} numberOfLines={1}>
              {item.note}
            </Text>
          ) : null}
          <Text
            style={[
              styles.status,
              { color: item.status === "fulfilled" ? colors.positive : colors.sub },
            ]}
            numberOfLines={1}
          >
            {STATUS_LABEL[item.status] ?? item.status}
            {item.status === "declined" && item.decline_reason
              ? ` — ${item.decline_reason}`
              : ""}
          </Text>
        </View>
        <Text style={[styles.amount, { color: colors.ink }]}>{amountText}</Text>
      </View>

      {pending && !confirming ? (
        <View style={styles.actions}>
          {incoming ? (
            <>
              <Button label="Pay" variant="primary" style={styles.action} onPress={pay} />
              <Button
                label="Decline"
                variant="secondary"
                style={styles.action}
                onPress={() => setConfirming(true)}
              />
            </>
          ) : (
            <Button
              label="Cancel request"
              variant="secondary"
              style={styles.action}
              onPress={cancel}
            />
          )}
        </View>
      ) : null}

      {pending && confirming ? (
        <View style={styles.confirm}>
          <Text style={[styles.confirmTitle, { color: colors.ink }]}>
            Decline this request?
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Add a reason (optional) — e.g. already paid you cash"
            placeholderTextColor={colors.sub}
            maxLength={200}
            style={[
              styles.reasonInput,
              { backgroundColor: colors.bg, color: colors.ink, borderColor: colors.line },
            ]}
          />
          <View style={styles.actions}>
            <Button
              label={busy ? "Declining…" : "Confirm decline"}
              variant="primary"
              style={styles.action}
              onPress={confirmDecline}
            />
            <Button
              label="Keep"
              variant="secondary"
              style={styles.action}
              onPress={() => {
                setConfirming(false);
                setReason("");
              }}
            />
          </View>
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
  note: { fontFamily: fonts.ui, fontSize: 12.5, marginTop: 1 },
  status: { fontFamily: fonts.ui, fontSize: 12, marginTop: 1 },
  amount: { fontFamily: fonts.ui, fontSize: 15, fontWeight: "700" },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  action: { flex: 1 },
  confirm: { marginTop: spacing.md, gap: spacing.sm },
  confirmTitle: { fontFamily: fonts.ui, fontSize: 14, fontWeight: "600" },
  reasonInput: {
    fontFamily: fonts.ui,
    fontSize: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: radius.input,
    borderWidth: 1,
  },
});
