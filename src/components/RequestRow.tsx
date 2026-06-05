import Feather from "@expo/vector-icons/Feather";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { NotifyAgainButton } from "@/components/NotifyAgainButton";
import { Avatar } from "@/design-system/primitives/Avatar";
import { useTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";
import { fonts } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { formatRowDateTime } from "@/features/payments/dateGroups";
import { requestsRepo } from "@/features/requests/requestsRepo";
import type { RequestItem } from "@/features/requests/useRequests";
import { displayName } from "@/lib/identity";
import { formatMoney } from "@/lib/money";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  fulfilled: "Paid",
  declined: "Declined",
  canceled: "Canceled",
};

// One request row: avatar · name/status/note · amount, with compact action chips below
// when pending. Incoming → Pay / Decline (Decline opens an inline reason confirm);
// outgoing → Notify again / Cancel. Amount decrypts on-device behind the unlock gate.
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

  const locked = !eerc.isDecryptionKeySet;
  let amountText: string;
  if (amount.isPending) amountText = "···";
  else if (amount.data == null) amountText = "—";
  else amountText = formatMoney(amount.data);

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["requests"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    ]);

  const confirmDecline = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await requestsRepo.setStatus(item.id, "declined", undefined, reason.trim() || undefined);
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

  const statusText =
    (STATUS_LABEL[item.status] ?? item.status) +
    (item.status === "declined" && item.decline_reason ? ` — ${item.decline_reason}` : "");
  const dateLabel = formatRowDateTime(item.created_at);
  const dirColor = incoming ? colors.actBlue : colors.positive;

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.row}>
        <Avatar name={name} size={42} />
        <View style={styles.who}>
          <Text style={[styles.line, styles.bold, { color: colors.ink }]} numberOfLines={1}>
            {name}
          </Text>
          {item.note ? (
            <Text style={[styles.note, { color: colors.ink }]} numberOfLines={1}>
              {item.note}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <View style={[styles.dirBadge, { backgroundColor: dirColor + "22" }]}>
              <Feather
                name={incoming ? "arrow-down-left" : "arrow-up-right"}
                size={12}
                color={dirColor}
              />
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              <Text style={{ color: dirColor, fontWeight: "700" }}>
                {incoming ? "You owe" : "Owes you"}
              </Text>
              <Text style={{ color: colors.sub }}>{"  ·  "}</Text>
              <Text style={{ color: item.status === "fulfilled" ? colors.positive : colors.sub }}>
                {statusText}
              </Text>
              <Text style={{ color: colors.sub }}>{`  ·  ${dateLabel}`}</Text>
            </Text>
          </View>
        </View>
        {locked ? (
          <Feather name="lock" size={16} color={colors.sub} />
        ) : (
          <Text style={[styles.amount, { color: colors.ink }]}>{amountText}</Text>
        )}
      </View>

      {pending && !confirming ? (
        <View style={styles.actions}>
          {incoming ? (
            <>
              <Pressable onPress={pay} disabled={amount.data == null}>
                <Text
                  style={[
                    styles.chip,
                    styles.solid,
                    { backgroundColor: colors.actBlue, opacity: amount.data == null ? 0.5 : 1 },
                  ]}
                >
                  Pay
                </Text>
              </Pressable>
              <Pressable onPress={() => setConfirming(true)}>
                <Text style={[styles.chip, styles.outline, { borderColor: colors.line, color: colors.ink }]}>
                  Decline
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <NotifyAgainButton
                requestId={item.id}
                lastRemindedAt={item.last_reminded_at}
                createdAt={item.created_at}
              />
              <Pressable onPress={cancel}>
                <Text style={[styles.chip, styles.outline, { borderColor: colors.line, color: colors.sub }]}>
                  Cancel
                </Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}

      {pending && confirming ? (
        <View style={styles.confirm}>
          <Text style={[styles.confirmTitle, { color: colors.ink }]}>Decline this request?</Text>
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
            <Pressable onPress={confirmDecline}>
              <Text style={[styles.chip, styles.solid, { backgroundColor: colors.actBlue }]}>
                {busy ? "Declining…" : "Confirm"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setConfirming(false);
                setReason("");
              }}
            >
              <Text style={[styles.chip, styles.outline, { borderColor: colors.line, color: colors.ink }]}>
                Keep
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, padding: 14, marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  who: { flex: 1, minWidth: 0 },
  line: { fontFamily: fonts.ui, fontSize: 14.5 },
  bold: { fontWeight: "700" },
  note: { fontFamily: fonts.ui, fontSize: 12.5, marginTop: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  meta: { fontFamily: fonts.ui, fontSize: 12, flexShrink: 1 },
  dirBadge: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  amount: { fontFamily: fonts.ui, fontSize: 16, fontWeight: "700" },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, flexWrap: "wrap" },
  chip: {
    fontFamily: fonts.ui,
    fontSize: 12.5,
    fontWeight: "700",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: radius.button,
    overflow: "hidden",
  },
  solid: { color: "#fff" },
  outline: { borderWidth: 1.5 },
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
