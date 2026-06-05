import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/design-system/primitives/Avatar";
import { useTheme } from "@/design-system/theme";
import { spacing } from "@/design-system/tokens";
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

// Column widths shared by the desktop Activity table header (activity.tsx) and
// the "table" variant below, so headers and cells stay aligned. Note = flex:1.
export const ACTIVITY_COLS = { who: 230, amount: 120 } as const;

// One Activity row across all kinds: transfers show the counterparty + note;
// deposit/withdraw show an icon tile + "Added money" / "Cashed out". The amount
// (green +money-in / red −money-out) is decrypted on-chain per tx and cached;
// it only runs once the decryption key is unlocked.
export function ActivityRow({
  item,
  variant = "list",
}: {
  item: ActivityEntry;
  variant?: "list" | "table";
}) {
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

  const leading = isTransfer ? (
    <Avatar name={name} size={36} />
  ) : (
    <View style={[styles.icon, styles.iconSm, { backgroundColor: colors.chip }]}>
      <Text style={styles.iconTextSm}>
        {CASH_META[item.kind as "deposit" | "withdraw"].icon}
      </Text>
    </View>
  );
  const amountColor = hasAmount
    ? positive
      ? colors.positive
      : colors.avRed
    : colors.sub;

  if (variant === "table") {
    return (
      <View style={styles.tRow}>
        <View style={styles.tWho}>
          {leading}
          <Text style={[styles.name, styles.tName, { color: colors.ink }]} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <Text
          style={[styles.tNote, { color: note ? colors.sub : colors.line }]}
          numberOfLines={1}
        >
          {note || "—"}
        </Text>
        <View style={styles.tAmount}>
          <Text style={[styles.amount, { color: amountColor }]}>{amountText}</Text>
          <Text style={[styles.time, { color: colors.sub }]}>
            {formatTimeOfDay(item.created_at)}
          </Text>
        </View>
      </View>
    );
  }

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
  // Desktop "table" variant — cells aligned to the activity.tsx header columns.
  iconSm: { width: 36, height: 36, borderRadius: 18 },
  iconTextSm: { fontSize: 16 },
  tRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  tWho: {
    flexBasis: ACTIVITY_COLS.who,
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  tName: { flexShrink: 1 },
  tNote: { flex: 1, fontFamily: fonts.ui, fontSize: 13.5, paddingRight: spacing.md },
  tAmount: { flexBasis: ACTIVITY_COLS.amount, flexGrow: 0, flexShrink: 0, alignItems: "flex-end" },
});
