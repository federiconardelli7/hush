import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/design-system/primitives/Avatar";
import { useTheme } from "@/design-system/theme";
import { fonts } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { formatTimeOfDay } from "@/features/payments/dateGroups";
import type { ActivityItem } from "@/features/payments/useActivity";
import { displayName } from "@/lib/identity";
import { formatSignedMoney } from "@/lib/money";

// One Activity row: the counterparty, the note, the time, and YOUR decrypted
// amount (green +received / red −sent). The amount is decrypted on-chain per tx
// and cached; it only runs once the decryption key is unlocked. When there's no
// public caption we fall back to the encrypted memo (visible to the two parties).
export function ActivityRow({ item }: { item: ActivityItem }) {
  const { colors } = useTheme();
  const eerc = useEerc();
  const isReceived = item.direction === "received";
  const counterAddress = isReceived
    ? item.sender_address
    : item.receiver_address;
  const name = displayName(
    isReceived ? item.sender : item.receiver,
    counterAddress,
  );

  const amount = useQuery({
    queryKey: ["tx-amount", item.tx_hash],
    enabled: eerc.isDecryptionKeySet,
    staleTime: Infinity,
    queryFn: () => eerc.decryptAmount(item.tx_hash, item.direction),
  });

  const memo = useQuery({
    queryKey: ["tx-memo", item.tx_hash],
    enabled: eerc.isDecryptionKeySet && !item.caption,
    staleTime: Infinity,
    queryFn: () => eerc.decryptMemo(item.tx_hash),
  });
  const note = item.caption ?? memo.data ?? "";

  let amountText: string;
  if (!eerc.isDecryptionKeySet) amountText = "🔒";
  else if (amount.isPending) amountText = "···";
  else if (amount.data == null) amountText = "—";
  else amountText = formatSignedMoney(amount.data, item.direction);
  const hasAmount = eerc.isDecryptionKeySet && amount.data != null;

  return (
    <View style={styles.row}>
      <Avatar name={name} size={42} />
      <View style={styles.who}>
        <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
          {name}
        </Text>
        {note ? (
          <Text style={[styles.note, { color: colors.sub }]} numberOfLines={1}>
            {note}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <Text
          style={[
            styles.amount,
            {
              color: hasAmount
                ? isReceived
                  ? colors.positive
                  : colors.avRed
                : colors.sub,
            },
          ]}
        >
          {amountText}
        </Text>
        <Text style={[styles.time, { color: colors.sub }]}>
          {formatTimeOfDay(item.created_at)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 13 },
  who: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.ui, fontSize: 14.5, fontWeight: "600" },
  note: { fontFamily: fonts.ui, fontSize: 12, marginTop: 1 },
  right: { alignItems: "flex-end" },
  amount: { fontFamily: fonts.ui, fontSize: 14.5, fontWeight: "700" },
  time: { fontFamily: fonts.ui, fontSize: 10.5, marginTop: 1 },
});
