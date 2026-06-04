import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/design-system/primitives/Avatar";
import { useTheme } from "@/design-system/theme";
import { fonts } from "@/design-system/typography";
import { useEerc } from "@/features/eerc/useEerc";
import { formatTimeOfDay } from "@/features/payments/dateGroups";
import type { ActivityEntry } from "@/features/payments/useActivity";
import { displayName } from "@/lib/identity";
import { formatSignedMoney } from "@/lib/money";

const CASH_META: Record<"deposit" | "withdraw", { icon: string; label: string }> = {
  deposit: { icon: "💳", label: "Added money" },
  withdraw: { icon: "🏦", label: "Cashed out" },
};

// One Activity row across all kinds: transfers show the counterparty + note;
// deposit/withdraw show an icon tile + "Added money" / "Cashed out". The amount
// (green +money-in / red −money-out) is decrypted on-chain per tx and cached;
// it only runs once the decryption key is unlocked.
export function ActivityRow({ item }: { item: ActivityEntry }) {
  const { colors } = useTheme();
  const eerc = useEerc();
  const isTransfer = item.kind === "sent" || item.kind === "received";
  const positive = item.kind === "received" || item.kind === "deposit";

  const amount = useQuery({
    queryKey: ["tx-amount", item.tx_hash],
    enabled: eerc.isDecryptionKeySet,
    staleTime: Infinity,
    queryFn: () => eerc.decryptAmount(item.tx_hash, item.kind),
  });

  const memo = useQuery({
    queryKey: ["tx-memo", item.tx_hash],
    enabled: eerc.isDecryptionKeySet && isTransfer && !item.caption,
    staleTime: Infinity,
    queryFn: () => eerc.decryptMemo(item.tx_hash),
  });

  const name = isTransfer
    ? displayName(item.counterparty, item.counterpartyAddress ?? "")
    : CASH_META[item.kind as "deposit" | "withdraw"].label;
  const note = isTransfer ? (item.caption ?? memo.data ?? "") : "Fuji · test tokens";

  let amountText: string;
  if (!eerc.isDecryptionKeySet) amountText = "🔒";
  else if (amount.isPending) amountText = "···";
  else if (amount.data == null) amountText = "—";
  else amountText = formatSignedMoney(amount.data, positive);
  const hasAmount = eerc.isDecryptionKeySet && amount.data != null;

  return (
    <View style={styles.row}>
      {isTransfer ? (
        <Avatar name={name} size={42} />
      ) : (
        <View style={[styles.icon, { backgroundColor: colors.chip }]}>
          <Text style={styles.iconText}>
            {CASH_META[item.kind as "deposit" | "withdraw"].icon}
          </Text>
        </View>
      )}
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
                ? positive
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
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  iconText: { fontSize: 19 },
  who: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.ui, fontSize: 14.5, fontWeight: "600" },
  note: { fontFamily: fonts.ui, fontSize: 12, marginTop: 1 },
  right: { alignItems: "flex-end" },
  amount: { fontFamily: fonts.ui, fontSize: 14.5, fontWeight: "700" },
  time: { fontFamily: fonts.ui, fontSize: 10.5, marginTop: 1 },
});
